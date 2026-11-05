#!/usr/bin/env node

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const mysql = require("mysql2/promise")

const projectRoot = path.resolve(__dirname, "..")
const migrationsDirectory = path.join(__dirname, "migrations")
const args = new Set(process.argv.slice(2))
const isStatus = args.has("--status")
const isDryRun = args.has("--dry-run")

if ((isStatus && isDryRun) || [...args].some((arg) => !["--status", "--dry-run"].includes(arg))) {
  console.error("Uso: npm run db:migrate [-- --status | -- --dry-run]")
  process.exit(1)
}

function loadEnvFile(filename) {
  if (!fs.existsSync(filename)) return

  for (const rawLine of fs.readFileSync(filename, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const separator = line.indexOf("=")
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function getConfig() {
  loadEnvFile(path.join(projectRoot, ".env.local"))

  const port = Number.parseInt(process.env.DB_PORT || "3306", 10)
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("DB_PORT debe ser un número de puerto válido")
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cotizaciones_db",
  }
}

function quoteIdentifier(identifier) {
  return `\`${identifier.replaceAll("`", "``")}\``
}

function getMigrations() {
  if (!fs.existsSync(migrationsDirectory)) {
    throw new Error("No existe la carpeta scripts/migrations")
  }

  const versions = new Set()
  const migrations = fs
    .readdirSync(migrationsDirectory)
    .filter((filename) => filename.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b))
    .map((filename) => {
      const match = filename.match(/^(\d{3,})_([a-z0-9_]+)\.sql$/i)
      if (!match) {
        throw new Error(`Nombre de migración inválido: ${filename}`)
      }
      if (versions.has(match[1])) {
        throw new Error(`La versión ${match[1]} está repetida`)
      }
      versions.add(match[1])

      const sql = fs.readFileSync(path.join(migrationsDirectory, filename), "utf8")
      if (!sql.trim()) {
        throw new Error(`La migración ${filename} está vacía`)
      }

      return {
        version: match[1],
        name: match[2],
        filename,
        sql,
        checksum: crypto.createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex"),
      }
    })

  if (migrations.length === 0) {
    throw new Error("No hay migraciones SQL para aplicar")
  }

  return migrations
}

async function migrationTableExists(connection) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'schema_migrations' LIMIT 1`
  )
  return rows.length > 0
}

async function getAppliedMigrations(connection) {
  if (!(await migrationTableExists(connection))) return new Map()

  const [rows] = await connection.execute(
    "SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version"
  )
  return new Map(rows.map((row) => [row.version, row]))
}

function assertChecksums(migrations, applied) {
  for (const migration of migrations) {
    const record = applied.get(migration.version)
    if (record && record.checksum !== migration.checksum) {
      throw new Error(
        `La migración ${migration.filename} fue modificada después de aplicarse. ` +
          "Crea una migración nueva en lugar de editar una ya ejecutada."
      )
    }
  }
}

async function createDatabase(config) {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
  })

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(config.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
  } finally {
    await connection.end()
  }
}

async function ensureMigrationTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

function printStatus(migrations, applied) {
  console.log("\nMigraciones de base de datos:\n")
  for (const migration of migrations) {
    const record = applied.get(migration.version)
    const status = record ? "APLICADA" : "PENDIENTE"
    const date = record ? new Date(record.applied_at).toLocaleString("es-CO") : "—"
    console.log(`  ${status.padEnd(10)} ${migration.filename.padEnd(48)} ${date}`)
  }
  console.log("")
}

async function main() {
  const migrations = getMigrations()

  if (isDryRun) {
    console.log("Simulación: no se abrirá conexión ni se modificará la base de datos.\n")
    for (const migration of migrations) {
      console.log(`  PENDIENTE  ${migration.filename}`)
    }
    return
  }

  const config = getConfig()
  if (!isStatus) {
    await createDatabase(config)
  }

  const connection = await mysql.createConnection({ ...config, multipleStatements: true })
  try {
    if (!isStatus) {
      await ensureMigrationTable(connection)
    }

    const applied = await getAppliedMigrations(connection)
    assertChecksums(migrations, applied)

    if (isStatus) {
      printStatus(migrations, applied)
      return
    }

    const pending = migrations.filter((migration) => !applied.has(migration.version))
    if (pending.length === 0) {
      console.log("La base de datos ya está actualizada.")
      return
    }

    for (const migration of pending) {
      console.log(`Aplicando ${migration.filename}...`)
      // MySQL confirma DDL de forma implícita. Todas las migraciones son
      // idempotentes para poder reintentarlas si una ejecución se interrumpe.
      await connection.query(migration.sql)
      await connection.execute(
        "INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)",
        [migration.version, migration.name, migration.checksum]
      )
    }

    console.log(`Listo. Se aplicaron ${pending.length} migración(es).`)
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(`Error de migración: ${error.message}`)
  process.exitCode = 1
})

