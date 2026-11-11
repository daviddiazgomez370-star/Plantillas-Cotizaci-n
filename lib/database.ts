import { query, generateUUID, transaction } from "./mysql"
import { ConflictError, ResourceNotFoundError } from "./errors"
import type { PoolConnection, RowDataPacket } from "mysql2/promise"

export type QuotationStatus = "pending" | "approved" | "converted" | "cancelled"

export interface Quotation {
  id: string
  created_at: string
  company_name: string
  company_nit: string
  company_address?: string
  company_phone?: string
  company_email?: string
  client_name: string
  client_nit?: string
  client_address?: string
  client_phone?: string
  client_email?: string
  products: any[]
  subtotal: number
  iva: number
  total: number
  delivery_time?: string
  warranty?: string
  observations?: string
  status: QuotationStatus
  work_start_date?: string
  work_end_date?: string
  pdf_url?: string
  updated_at: string
}

export interface Invoice {
  id: string
  created_at: string
  quotation_id?: string
  free_document_id?: string
  company_name: string
  company_nit: string
  company_address?: string
  company_phone?: string
  company_email?: string
  client_name: string
  client_nit?: string
  client_address?: string
  client_phone?: string
  client_email?: string
  products: any[]
  subtotal: number
  iva: number
  total: number
  work_description?: string
  issue_date?: string
  work_start_date?: string
  work_end_date?: string
  payment_date?: string
  payment_method?: string
  pdf_url?: string
  updated_at: string
}

export async function saveQuotation(quotation: Omit<Quotation, "id" | "created_at" | "updated_at">) {
  const id = generateUUID()
  const productsJson = JSON.stringify(quotation.products)

  const sql = `
    INSERT INTO quotations (
      id, company_name, company_nit, company_address, company_phone, company_email,
      client_name, client_nit, client_address, client_phone, client_email,
      products, subtotal, iva, total, delivery_time, warranty, observations,
      status, work_start_date, work_end_date, pdf_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  await query(sql, [
    id,
    quotation.company_name,
    quotation.company_nit,
    quotation.company_address || null,
    quotation.company_phone || null,
    quotation.company_email || null,
    quotation.client_name,
    quotation.client_nit || null,
    quotation.client_address || null,
    quotation.client_phone || null,
    quotation.client_email || null,
    productsJson,
    quotation.subtotal,
    quotation.iva,
    quotation.total,
    quotation.delivery_time || null,
    quotation.warranty || null,
    quotation.observations || null,
    quotation.status,
    quotation.work_start_date || null,
    quotation.work_end_date || null,
    quotation.pdf_url || null,
  ])

  return getQuotationById(id)
}

export async function getQuotations() {
  const sql = "SELECT * FROM quotations ORDER BY created_at DESC"
  const results = await query<any[]>(sql)

  return results.map((row) => ({
    ...row,
    products: typeof row.products === "string" ? JSON.parse(row.products) : row.products,
  })) as Quotation[]
}

export async function getQuotationById(id: string) {
  const sql = "SELECT * FROM quotations WHERE id = ?"
  const results = await query<any[]>(sql, [id])

  if (results.length === 0) {
    throw new Error("Cotización no encontrada")
  }

  const row = results[0]
  return {
    ...row,
    products: typeof row.products === "string" ? JSON.parse(row.products) : row.products,
  } as Quotation
}

export async function updateQuotationStatus(id: string, status: QuotationStatus) {
  const sql = "UPDATE quotations SET status = ? WHERE id = ?"
  await query(sql, [status, id])
  return getQuotationById(id)
}

export async function saveInvoice(invoice: Omit<Invoice, "id" | "created_at" | "updated_at">) {
  const id = generateUUID()
  const productsJson = JSON.stringify(invoice.products)

  const sql = `
    INSERT INTO invoices (
      id, quotation_id, free_document_id, company_name, company_nit, company_address, company_phone, company_email,
      client_name, client_nit, client_address, client_phone, client_email,
      products, subtotal, iva, total, work_description, work_start_date, work_end_date,
      issue_date, payment_date, payment_method, pdf_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  await query(sql, [
    id,
    invoice.quotation_id || null,
    invoice.free_document_id || null,
    invoice.company_name,
    invoice.company_nit,
    invoice.company_address || null,
    invoice.company_phone || null,
    invoice.company_email || null,
    invoice.client_name,
    invoice.client_nit || null,
    invoice.client_address || null,
    invoice.client_phone || null,
    invoice.client_email || null,
    productsJson,
    invoice.subtotal,
    invoice.iva,
    invoice.total,
    invoice.work_description || null,
    invoice.work_start_date || null,
    invoice.work_end_date || null,
    invoice.issue_date || null,
    invoice.payment_date || null,
    invoice.payment_method || null,
    invoice.pdf_url || null,
  ])

  return getInvoiceById(id)
}

export async function saveInvoiceFromFreeDocument(
  invoice: Omit<Invoice, "id" | "created_at" | "updated_at">
) {
  if (!invoice.free_document_id) {
    throw new Error("Falta el documento libre de origen")
  }

  const id = generateUUID()
  const productsJson = JSON.stringify(invoice.products)

  await transaction(async (connection) => {
    const [documents] = await connection.execute<any[]>(
      "SELECT status FROM free_documents WHERE id = ? FOR UPDATE",
      [invoice.free_document_id]
    )
    const document = documents[0]

    if (!document) {
      throw new Error("El documento libre no existe")
    }
    if (document.status === "converted") {
      throw new Error("Este documento libre ya fue convertido en una cuenta de cobro")
    }

    await connection.execute(
      `INSERT INTO invoices (
        id, quotation_id, free_document_id, company_name, company_nit, company_address, company_phone, company_email,
        client_name, client_nit, client_address, client_phone, client_email,
        products, subtotal, iva, total, work_description, work_start_date, work_end_date,
        issue_date, payment_date, payment_method, pdf_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        invoice.quotation_id || null,
        invoice.free_document_id,
        invoice.company_name,
        invoice.company_nit,
        invoice.company_address || null,
        invoice.company_phone || null,
        invoice.company_email || null,
        invoice.client_name,
        invoice.client_nit || null,
        invoice.client_address || null,
        invoice.client_phone || null,
        invoice.client_email || null,
        productsJson,
        invoice.subtotal,
        invoice.iva,
        invoice.total,
        invoice.work_description || null,
        invoice.work_start_date || null,
        invoice.work_end_date || null,
        invoice.issue_date || null,
        invoice.payment_date || null,
        invoice.payment_method || null,
        invoice.pdf_url || null,
      ]
    )

    await connection.execute(
      "UPDATE free_documents SET status = 'converted', updated_at = NOW() WHERE id = ?",
      [invoice.free_document_id]
    )
  })

  return getInvoiceById(id)
}

export async function updateInvoice(id: string, invoice: Partial<Invoice>) {
  const productsJson = JSON.stringify(invoice.products ?? [])

  const sql = `
    UPDATE invoices SET
      company_name = ?, company_nit = ?, company_address = ?, company_phone = ?, company_email = ?,
      client_name = ?, client_nit = ?, client_address = ?, client_phone = ?, client_email = ?,
      products = ?, subtotal = ?, iva = ?, total = ?, work_description = ?, work_start_date = ?, work_end_date = ?,
      issue_date = ?, payment_date = ?, payment_method = ?,
      updated_at = NOW()
    WHERE id = ?
  `

  await query(sql, [
    invoice.company_name ?? "",
    invoice.company_nit ?? "",
    invoice.company_address ?? null,
    invoice.company_phone ?? null,
    invoice.company_email ?? null,
    invoice.client_name ?? "",
    invoice.client_nit ?? null,
    invoice.client_address ?? null,
    invoice.client_phone ?? null,
    invoice.client_email ?? null,
    productsJson,
    invoice.subtotal ?? 0,
    invoice.iva ?? 0,
    invoice.total ?? 0,
    invoice.work_description ?? null,
    invoice.work_start_date ?? null,
    invoice.work_end_date ?? null,
    invoice.issue_date ?? null,
    invoice.payment_date ?? null,
    invoice.payment_method ?? null,
    id,
  ])

  return getInvoiceById(id)
}

export async function getInvoices() {
  const sql = "SELECT * FROM invoices ORDER BY created_at DESC"
  const results = await query<any[]>(sql)

  return results.map((row) => ({
    ...row,
    products: typeof row.products === "string" ? JSON.parse(row.products) : row.products,
  })) as Invoice[]
}

export async function getInvoiceById(id: string) {
  const sql = "SELECT * FROM invoices WHERE id = ?"
  const results = await query<any[]>(sql, [id])

  if (results.length === 0) {
    throw new Error("Cuenta de cobro no encontrada")
  }

  const row = results[0]
  return {
    ...row,
    products: typeof row.products === "string" ? JSON.parse(row.products) : row.products,
  } as Invoice
}

export async function deleteQuotation(id: string) {
  const sql = "DELETE FROM quotations WHERE id = ?"
  await query(sql, [id])
}

export async function deleteInvoice(id: string) {
  const sql = "DELETE FROM invoices WHERE id = ?"
  await query(sql, [id])
}

// ---- Documentos Libres ----

export type FreeDocumentStatus = "pending" | "converted"

export interface FreeDocument {
  id: string
  created_at: string
  document_title: string
  document_number?: string
  company_name: string
  company_nit?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  client_name: string
  client_nit?: string
  client_address?: string
  client_phone?: string
  client_email?: string
  general_description?: string
  items: any[]
  total: number
  delivery_days?: number
  warranty_months?: number
  notes?: string
  document_date?: string
  status: FreeDocumentStatus
  updated_at: string
}

export async function saveFreeDocument(doc: Omit<FreeDocument, "id" | "created_at" | "updated_at" | "status">) {
  const id = generateUUID()
  const itemsJson = JSON.stringify(doc.items)

  const sql = `
    INSERT INTO free_documents (
      id, document_title, document_number,
      company_name, company_nit, company_address, company_phone, company_email,
      client_name, client_nit, client_address, client_phone, client_email,
      general_description, items, total,
      delivery_days, warranty_months, notes, document_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  await query(sql, [
    id,
    doc.document_title,
    doc.document_number || `DOC-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`,
    doc.company_name,
    doc.company_nit || null,
    doc.company_address || null,
    doc.company_phone || null,
    doc.company_email || null,
    doc.client_name,
    doc.client_nit || null,
    doc.client_address || null,
    doc.client_phone || null,
    doc.client_email || null,
    doc.general_description || null,
    itemsJson,
    doc.total,
    doc.delivery_days ?? 0,
    doc.warranty_months ?? 0,
    doc.notes || null,
    doc.document_date || null,
  ])

  return getFreeDocumentById(id)
}

export async function getFreeDocuments() {
  const sql = "SELECT * FROM free_documents ORDER BY created_at DESC"
  const results = await query<any[]>(sql)

  return results.map((row) => ({
    ...row,
    items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
    status: row.status || "pending",
  })) as FreeDocument[]
}

export async function getFreeDocumentById(id: string) {
  const sql = "SELECT * FROM free_documents WHERE id = ?"
  const results = await query<any[]>(sql, [id])

  if (results.length === 0) {
    throw new Error("Documento libre no encontrado")
  }

  const row = results[0]
  return {
    ...row,
    items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
    status: row.status || "pending",
  } as FreeDocument
}

export async function updateFreeDocument(id: string, doc: Partial<FreeDocument>) {
  const itemsJson = JSON.stringify(doc.items ?? [])

  const sql = `
    UPDATE free_documents SET
      document_title = ?, document_number = ?,
      company_name = ?, company_nit = ?, company_address = ?, company_phone = ?, company_email = ?,
      client_name = ?, client_nit = ?, client_address = ?, client_phone = ?, client_email = ?,
      general_description = ?, items = ?, total = ?,
      delivery_days = ?, warranty_months = ?, notes = ?, document_date = ?,
      updated_at = NOW()
    WHERE id = ?
  `

  await query(sql, [
    doc.document_title ?? "DOCUMENTO",
    doc.document_number ?? null,
    doc.company_name ?? "",
    doc.company_nit ?? null,
    doc.company_address ?? null,
    doc.company_phone ?? null,
    doc.company_email ?? null,
    doc.client_name ?? "",
    doc.client_nit ?? null,
    doc.client_address ?? null,
    doc.client_phone ?? null,
    doc.client_email ?? null,
    doc.general_description ?? null,
    itemsJson,
    doc.total ?? 0,
    doc.delivery_days ?? 0,
    doc.warranty_months ?? 0,
    doc.notes ?? null,
    doc.document_date ?? null,
    id,
  ])

  return getFreeDocumentById(id)
}

export async function deleteFreeDocument(id: string) {
  const sql = "DELETE FROM free_documents WHERE id = ?"
  await query(sql, [id])
}

// ---- Clientes ----

export interface Client {
  id: string
  created_at: string
  name: string
  nit?: string
  address?: string
  phone?: string
  email?: string
  notes?: string
  updated_at: string
}

export async function saveClient(client: Omit<Client, "id" | "created_at" | "updated_at">) {
  const id = generateUUID()

  const sql = `
    INSERT INTO clients (id, name, nit, address, phone, email, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `

  await query(sql, [
    id,
    client.name,
    client.nit || null,
    client.address || null,
    client.phone || null,
    client.email || null,
    client.notes || null,
  ])

  return getClientById(id)
}

export async function getClients() {
  const sql = "SELECT * FROM clients ORDER BY created_at DESC"
  return (await query<Client[]>(sql)) as Client[]
}

export async function getClientById(id: string) {
  const sql = "SELECT * FROM clients WHERE id = ?"
  const results = await query<Client[]>(sql, [id])

  if (results.length === 0) {
    throw new Error("Cliente no encontrado")
  }

  return results[0]
}

export async function updateClient(id: string, client: Partial<Client>) {
  const sql = `
    UPDATE clients SET
      name = ?, nit = ?, address = ?, phone = ?, email = ?, notes = ?,
      updated_at = NOW()
    WHERE id = ?
  `

  await query(sql, [
    client.name || "",
    client.nit || null,
    client.address || null,
    client.phone || null,
    client.email || null,
    client.notes || null,
    id,
  ])

  return getClientById(id)
}

export async function deleteClient(id: string) {
  const sql = "DELETE FROM clients WHERE id = ?"
  await query(sql, [id])
}

// ---- Trabajadores y trabajos (Fase 1) ----

export type WorkerCompensationType = "daily_rate" | "profit_share"
export type JobStatus = "accepted" | "in_progress" | "completed"

export interface Worker {
  id: string
  name: string
  job_title: string
  phone?: string
  compensation_type: WorkerCompensationType
  daily_rate?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface JobWorker {
  id: string
  name: string
  job_title: string
  compensation_type: WorkerCompensationType
  daily_rate?: number
  is_active: boolean
  assigned_at: string
}

export interface JobStatusHistory {
  id: number
  previous_status?: JobStatus
  new_status: JobStatus
  changed_at: string
}

export interface Job {
  id: string
  name: string
  description?: string
  client_id?: string
  client_name?: string
  quotation_id?: string
  agreed_value: number
  start_date?: string
  end_date?: string
  status: JobStatus
  notes?: string
  worker_count?: number
  created_at: string
  updated_at: string
  workers?: JobWorker[]
  status_history?: JobStatusHistory[]
}

export interface WorkerInput {
  name: string
  job_title: string
  phone?: string
  compensation_type: WorkerCompensationType
  daily_rate?: number
}

export interface JobInput {
  name: string
  description?: string
  client_id?: string
  quotation_id?: string
  agreed_value: number
  start_date?: string
  end_date?: string
  notes?: string
}

function toDateInputValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return typeof value === "string" ? value.slice(0, 10) : value
}

function normalizeWorker(row: any): Worker {
  return {
    ...row,
    daily_rate: row.daily_rate === null || row.daily_rate === undefined ? undefined : Number(row.daily_rate),
    is_active: Boolean(row.is_active),
  }
}

function normalizeJob(row: any): Job {
  return {
    ...row,
    agreed_value: Number(row.agreed_value),
    worker_count: row.worker_count === undefined ? undefined : Number(row.worker_count),
    start_date: toDateInputValue(row.start_date) as string | undefined,
    end_date: toDateInputValue(row.end_date) as string | undefined,
  }
}

async function assertOptionalReference(
  connection: PoolConnection,
  table: "clients" | "quotations",
  id: string | undefined,
  label: string
) {
  if (!id) return
  const [rows] = await connection.execute<any[]>(`SELECT id FROM ${table} WHERE id = ?`, [id])
  if (rows.length === 0) throw new ResourceNotFoundError(`${label} no encontrado`)
}

async function getWorkersForAssignment(connection: PoolConnection, workerIds: string[]) {
  if (workerIds.length === 0) return

  const placeholders = workerIds.map(() => "?").join(", ")
  const [workers] = await connection.execute<any[]>(
    `SELECT id, is_active FROM workers WHERE id IN (${placeholders}) FOR UPDATE`,
    workerIds
  )
  const foundIds = new Set(workers.map((worker: { id: string }) => worker.id))
  const missingId = workerIds.find((workerId) => !foundIds.has(workerId))
  if (missingId) throw new ResourceNotFoundError("Uno de los trabajadores seleccionados no existe")

  if (workers.some((worker: { is_active: number }) => !worker.is_active)) {
    throw new ConflictError("No puedes asignar trabajadores inactivos a un trabajo")
  }
}

async function assertJobExists(connection: PoolConnection, jobId: string, lock = false) {
  const [jobs] = await connection.execute<any[]>(
    `SELECT id, status FROM jobs WHERE id = ?${lock ? " FOR UPDATE" : ""}`,
    [jobId]
  )
  if (jobs.length === 0) throw new ResourceNotFoundError("Trabajo no encontrado")
  return jobs[0] as { id: string; status: JobStatus }
}

export async function saveWorker(worker: WorkerInput) {
  const id = generateUUID()
  await query(
    `INSERT INTO workers (id, name, job_title, phone, compensation_type, daily_rate)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      worker.name,
      worker.job_title,
      worker.phone || null,
      worker.compensation_type,
      worker.daily_rate ?? null,
    ]
  )
  return getWorkerById(id)
}

export async function getWorkers() {
  const workers = await query<any[]>("SELECT * FROM workers ORDER BY is_active DESC, name ASC")
  return workers.map(normalizeWorker)
}

export async function getWorkerById(id: string) {
  const workers = await query<any[]>("SELECT * FROM workers WHERE id = ?", [id])
  if (workers.length === 0) throw new ResourceNotFoundError("Trabajador no encontrado")
  return normalizeWorker(workers[0])
}

export async function updateWorker(id: string, worker: WorkerInput) {
  const result = await query<any>(
    `UPDATE workers SET
       name = ?, job_title = ?, phone = ?, compensation_type = ?, daily_rate = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      worker.name,
      worker.job_title,
      worker.phone || null,
      worker.compensation_type,
      worker.daily_rate ?? null,
      id,
    ]
  )
  if (result.affectedRows === 0) throw new ResourceNotFoundError("Trabajador no encontrado")
  return getWorkerById(id)
}

export async function setWorkerActive(id: string, isActive: boolean) {
  const result = await query<any>(
    "UPDATE workers SET is_active = ?, updated_at = NOW() WHERE id = ?",
    [isActive, id]
  )
  if (result.affectedRows === 0) throw new ResourceNotFoundError("Trabajador no encontrado")
  return getWorkerById(id)
}

export async function saveJob(job: JobInput, workerIds: string[] = []) {
  const id = generateUUID()

  await transaction(async (connection) => {
    await assertOptionalReference(connection, "clients", job.client_id, "Cliente")
    await assertOptionalReference(connection, "quotations", job.quotation_id, "Cotizacion")
    await getWorkersForAssignment(connection, workerIds)

    await connection.execute(
      `INSERT INTO jobs (
        id, name, description, client_id, quotation_id, agreed_value, start_date, end_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'accepted', ?)`,
      [
        id,
        job.name,
        job.description || null,
        job.client_id || null,
        job.quotation_id || null,
        job.agreed_value,
        job.start_date || null,
        job.end_date || null,
        job.notes || null,
      ]
    )
    await connection.execute(
      "INSERT INTO job_status_history (job_id, previous_status, new_status) VALUES (?, NULL, 'accepted')",
      [id]
    )

    for (const workerId of workerIds) {
      await connection.execute("INSERT INTO job_workers (job_id, worker_id) VALUES (?, ?)", [id, workerId])
    }
  })

  return getJobById(id)
}

export async function getJobs() {
  const jobs = await query<any[]>(`
    SELECT j.*, c.name AS client_name,
      (SELECT COUNT(*) FROM job_workers jw WHERE jw.job_id = j.id) AS worker_count
    FROM jobs j
    LEFT JOIN clients c ON c.id = j.client_id
    ORDER BY j.created_at DESC
  `)
  return jobs.map(normalizeJob)
}

export async function getJobById(id: string) {
  const jobs = await query<any[]>(`
    SELECT j.*, c.name AS client_name
    FROM jobs j
    LEFT JOIN clients c ON c.id = j.client_id
    WHERE j.id = ?
  `, [id])
  if (jobs.length === 0) throw new ResourceNotFoundError("Trabajo no encontrado")

  const [workers, statusHistory] = await Promise.all([
    query<any[]>(`
      SELECT w.id, w.name, w.job_title, w.compensation_type, w.daily_rate, w.is_active, jw.assigned_at
      FROM job_workers jw
      INNER JOIN workers w ON w.id = jw.worker_id
      WHERE jw.job_id = ?
      ORDER BY w.name ASC
    `, [id]),
    query<any[]>(`
      SELECT id, previous_status, new_status, changed_at
      FROM job_status_history
      WHERE job_id = ?
      ORDER BY changed_at DESC, id DESC
    `, [id]),
  ])

  return {
    ...normalizeJob(jobs[0]),
    workers: workers.map((worker) => normalizeWorker(worker)),
    status_history: statusHistory,
  }
}

export async function updateJob(id: string, job: JobInput) {
  await transaction(async (connection) => {
    await assertJobExists(connection, id, true)
    await assertOptionalReference(connection, "clients", job.client_id, "Cliente")
    await assertOptionalReference(connection, "quotations", job.quotation_id, "Cotizacion")

    await connection.execute(
      `UPDATE jobs SET
        name = ?, description = ?, client_id = ?, quotation_id = ?, agreed_value = ?,
        start_date = ?, end_date = ?, notes = ?, updated_at = NOW()
      WHERE id = ?`,
      [
        job.name,
        job.description || null,
        job.client_id || null,
        job.quotation_id || null,
        job.agreed_value,
        job.start_date || null,
        job.end_date || null,
        job.notes || null,
        id,
      ]
    )
  })
  return getJobById(id)
}

const allowedJobTransitions: Record<JobStatus, JobStatus[]> = {
  accepted: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
}

export async function updateJobStatus(id: string, nextStatus: JobStatus) {
  await transaction(async (connection) => {
    const job = await assertJobExists(connection, id, true)
    if (job.status === nextStatus || !allowedJobTransitions[job.status].includes(nextStatus)) {
      throw new ConflictError("La transicion de estado solicitada no es valida")
    }

    await connection.execute("UPDATE jobs SET status = ?, updated_at = NOW() WHERE id = ?", [nextStatus, id])
    await connection.execute(
      "INSERT INTO job_status_history (job_id, previous_status, new_status) VALUES (?, ?, ?)",
      [id, job.status, nextStatus]
    )
  })
  return getJobById(id)
}

export async function assignWorkersToJob(jobId: string, workerIds: string[]) {
  await transaction(async (connection) => {
    await assertJobExists(connection, jobId, true)
    await getWorkersForAssignment(connection, workerIds)
    const placeholders = workerIds.map(() => "?").join(", ")
    const [existing] = await connection.execute<any[]>(
      `SELECT worker_id FROM job_workers WHERE job_id = ? AND worker_id IN (${placeholders}) FOR UPDATE`,
      [jobId, ...workerIds]
    )
    if (existing.length > 0) {
      throw new ConflictError("Uno de los trabajadores ya esta asignado a este trabajo")
    }

    for (const workerId of workerIds) {
      await connection.execute("INSERT INTO job_workers (job_id, worker_id) VALUES (?, ?)", [jobId, workerId])
    }
  })
  return getJobById(jobId)
}

export async function removeWorkerFromJob(jobId: string, workerId: string) {
  await transaction(async (connection) => {
    await assertJobExists(connection, jobId, true)
    const [result] = await connection.execute<any>(
      "DELETE FROM job_workers WHERE job_id = ? AND worker_id = ?",
      [jobId, workerId]
    )
    if (result.affectedRows === 0) {
      throw new ResourceNotFoundError("El trabajador no esta asignado a este trabajo")
    }
  })
  return getJobById(jobId)
}

// ---- Dias trabajados y asistencia (Fase 2) ----

export type AttendanceStatus = "worked" | "not_worked"

export interface WorkAttendance {
  id: string
  job_id: string
  job_name: string
  worker_id: string
  worker_name: string
  worker_job_title: string
  worker_is_active: boolean
  work_date: string
  status: AttendanceStatus
  note?: string
  created_at: string
  updated_at: string
}

export interface AttendanceCount {
  worker_id: string
  worker_name: string
  worker_job_title: string
  worker_is_active: boolean
  worked_days: number
}

type WorkAttendanceRow = Omit<WorkAttendance, "worker_is_active" | "note"> & {
  worker_is_active: number
  note: string | null
}

type AttendanceCountRow = Omit<AttendanceCount, "worker_is_active" | "worked_days"> & {
  worker_is_active: number
  worked_days: number | string
}

export interface AttendanceFilters {
  month?: string
  worker_id?: string
  status?: AttendanceStatus
}

export interface AttendanceInput {
  work_date: string
  records: Array<{
    worker_id: string
    status: AttendanceStatus
    note?: string
  }>
}

type AssignedWorkerRow = RowDataPacket & {
  worker_id: string
  is_active: number
}

type AttendanceIdRow = RowDataPacket & {
  id: string
}

function normalizeWorkAttendance(row: WorkAttendanceRow): WorkAttendance {
  return {
    ...row,
    worker_is_active: Boolean(row.worker_is_active),
    note: row.note || undefined,
  }
}

export async function getJobAttendance(jobId: string, filters: AttendanceFilters = {}) {
  const job = await getJobById(jobId)
  const where = ["wa.job_id = ?"]
  const params: Array<string> = [jobId]

  if (filters.month) {
    const firstDay = `${filters.month}-01`
    where.push("wa.work_date >= ?", "wa.work_date < DATE_ADD(?, INTERVAL 1 MONTH)")
    params.push(firstDay, firstDay)
  }
  if (filters.worker_id) {
    where.push("wa.worker_id = ?")
    params.push(filters.worker_id)
  }
  if (filters.status) {
    where.push("wa.status = ?")
    params.push(filters.status)
  }

  const attendance = await query<WorkAttendanceRow[]>(`
    SELECT
      wa.id, wa.job_id, j.name AS job_name, wa.worker_id, w.name AS worker_name,
      w.job_title AS worker_job_title, w.is_active AS worker_is_active,
      DATE_FORMAT(wa.work_date, '%Y-%m-%d') AS work_date, wa.status, wa.note,
      wa.created_at, wa.updated_at
    FROM work_attendance wa
    INNER JOIN jobs j ON j.id = wa.job_id
    INNER JOIN workers w ON w.id = wa.worker_id
    WHERE ${where.join(" AND ")}
    ORDER BY wa.work_date DESC, w.name ASC
  `, params)

  const counterParams: Array<string> = [jobId, jobId, jobId]
  const counterDateFilter = filters.month
    ? "AND wa.work_date >= ? AND wa.work_date < DATE_ADD(?, INTERVAL 1 MONTH)"
    : ""
  if (filters.month) {
    const firstDay = `${filters.month}-01`
    counterParams.push(firstDay, firstDay)
  }

  const counts = await query<AttendanceCountRow[]>(`
    SELECT
      participants.worker_id, w.name AS worker_name, w.job_title AS worker_job_title,
      w.is_active AS worker_is_active, COUNT(wa.id) AS worked_days
    FROM (
      SELECT worker_id FROM job_workers WHERE job_id = ?
      UNION
      SELECT worker_id FROM work_attendance WHERE job_id = ?
    ) AS participants
    INNER JOIN workers w ON w.id = participants.worker_id
    LEFT JOIN work_attendance wa
      ON wa.job_id = ?
      AND wa.worker_id = participants.worker_id
      AND wa.status = 'worked'
      ${counterDateFilter}
    GROUP BY participants.worker_id, w.name, w.job_title, w.is_active
    ORDER BY w.name ASC
  `, counterParams)

  return {
    job,
    records: attendance.map(normalizeWorkAttendance),
    counts: counts.map((count) => ({
      ...count,
      worker_is_active: Boolean(count.worker_is_active),
      worked_days: Number(count.worked_days),
    })),
  }
}

export async function saveJobAttendance(jobId: string, attendance: AttendanceInput) {
  let created = 0
  let updated = 0

  await transaction(async (connection) => {
    const job = await assertJobExists(connection, jobId, true)
    if (job.status === "accepted") {
      throw new ConflictError("La asistencia solo se puede registrar cuando el trabajo esta En proceso")
    }
    if (job.status === "completed") {
      throw new ConflictError("No se puede modificar la asistencia de un trabajo Finalizado")
    }

    const workerIds = attendance.records.map((record) => record.worker_id)
    const placeholders = workerIds.map(() => "?").join(", ")
    const [assignedWorkers] = await connection.execute<AssignedWorkerRow[]>(
      `SELECT jw.worker_id, w.is_active
       FROM job_workers jw
       INNER JOIN workers w ON w.id = jw.worker_id
       WHERE jw.job_id = ? AND jw.worker_id IN (${placeholders})
       FOR UPDATE`,
      [jobId, ...workerIds]
    )
    const assignedById = new Map(assignedWorkers.map((worker) => [worker.worker_id, worker]))
    const missingWorker = workerIds.find((workerId) => !assignedById.has(workerId))
    if (missingWorker) {
      throw new ConflictError("Solo puedes registrar asistencia para trabajadores asignados al trabajo")
    }
    if (assignedWorkers.some((worker) => !worker.is_active)) {
      throw new ConflictError("No puedes registrar asistencia nueva para trabajadores inactivos")
    }

    for (const record of attendance.records) {
      const [existing] = await connection.execute<AttendanceIdRow[]>(
        `SELECT id FROM work_attendance
         WHERE job_id = ? AND worker_id = ? AND work_date = ?
         FOR UPDATE`,
        [jobId, record.worker_id, attendance.work_date]
      )

      if (existing.length > 0) {
        await connection.execute(
          `UPDATE work_attendance
           SET status = ?, note = ?, updated_at = NOW()
           WHERE id = ?`,
          [record.status, record.note || null, existing[0].id]
        )
        updated += 1
      } else {
        await connection.execute(
          `INSERT INTO work_attendance (id, job_id, worker_id, work_date, status, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [generateUUID(), jobId, record.worker_id, attendance.work_date, record.status, record.note || null]
        )
        created += 1
      }
    }
  })

  return { created, updated }
}

// ---- Gastos por trabajo (Fase 3) ----

export type ExpenseCategory = "materials" | "transport" | "tools" | "food" | "services" | "other"

export interface JobExpense {
  id: string
  job_id: string
  expense_date: string
  category: ExpenseCategory
  description: string
  amount: number
  note?: string
  created_at: string
  updated_at: string
}

export interface JobExpenseInput {
  expense_date: string
  category: ExpenseCategory
  description: string
  amount: number
  note?: string
}

export interface ExpenseFilters {
  month?: string
  category?: ExpenseCategory
}

export interface ExpenseCategoryTotal {
  category: ExpenseCategory
  total: number
}

type JobExpenseRow = Omit<JobExpense, "amount" | "note"> & {
  amount: number | string
  note: string | null
}

type ExpenseSummaryRow = RowDataPacket & {
  expense_count: number | string
  total_expenses: number | string | null
}

type ExpenseCategoryTotalRow = RowDataPacket & {
  category: ExpenseCategory
  total: number | string
}

type ExpenseIdRow = RowDataPacket & {
  id: string
}

function normalizeJobExpense(row: JobExpenseRow): JobExpense {
  return {
    ...row,
    amount: Number(row.amount),
    note: row.note || undefined,
  }
}

function expenseWhere(jobId: string, filters: ExpenseFilters) {
  const where = ["job_id = ?"]
  const params: string[] = [jobId]

  if (filters.month) {
    const firstDay = `${filters.month}-01`
    where.push("expense_date >= ?", "expense_date < DATE_ADD(?, INTERVAL 1 MONTH)")
    params.push(firstDay, firstDay)
  }
  if (filters.category) {
    where.push("category = ?")
    params.push(filters.category)
  }
  return { where, params }
}

async function getJobExpenseById(jobId: string, expenseId: string) {
  const expenses = await query<JobExpenseRow[]>(`
    SELECT id, job_id, DATE_FORMAT(expense_date, '%Y-%m-%d') AS expense_date,
      category, description, amount, note, created_at, updated_at
    FROM job_expenses
    WHERE id = ? AND job_id = ?
  `, [expenseId, jobId])
  if (expenses.length === 0) throw new ResourceNotFoundError("Gasto no encontrado para este trabajo")
  return normalizeJobExpense(expenses[0])
}

function assertExpensesEditable(status: JobStatus) {
  if (status === "completed") {
    throw new ConflictError("No se pueden modificar los gastos de un trabajo Finalizado")
  }
}

export async function getJobExpenses(jobId: string, filters: ExpenseFilters = {}) {
  const job = await getJobById(jobId)
  const { where, params } = expenseWhere(jobId, filters)
  const condition = where.join(" AND ")

  const [expenses, summaries, categoryTotals] = await Promise.all([
    query<JobExpenseRow[]>(`
      SELECT id, job_id, DATE_FORMAT(expense_date, '%Y-%m-%d') AS expense_date,
        category, description, amount, note, created_at, updated_at
      FROM job_expenses
      WHERE ${condition}
      ORDER BY expense_date DESC, created_at DESC
    `, params),
    query<ExpenseSummaryRow[]>(`
      SELECT COUNT(*) AS expense_count, COALESCE(SUM(amount), 0) AS total_expenses
      FROM job_expenses
      WHERE ${condition}
    `, params),
    query<ExpenseCategoryTotalRow[]>(`
      SELECT category, SUM(amount) AS total
      FROM job_expenses
      WHERE ${condition}
      GROUP BY category
      ORDER BY category ASC
    `, params),
  ])

  const summary = summaries[0]
  return {
    job,
    expenses: expenses.map(normalizeJobExpense),
    summary: {
      expense_count: Number(summary?.expense_count || 0),
      total_expenses: Number(summary?.total_expenses || 0),
      by_category: categoryTotals.map((total) => ({ category: total.category, total: Number(total.total) })),
    },
  }
}

export async function saveJobExpense(jobId: string, expense: JobExpenseInput) {
  const id = generateUUID()
  await transaction(async (connection) => {
    const job = await assertJobExists(connection, jobId, true)
    assertExpensesEditable(job.status)
    await connection.execute(
      `INSERT INTO job_expenses (id, job_id, expense_date, category, description, amount, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, jobId, expense.expense_date, expense.category, expense.description, expense.amount, expense.note || null]
    )
  })
  return getJobExpenseById(jobId, id)
}

export async function updateJobExpense(jobId: string, expenseId: string, expense: JobExpenseInput) {
  await transaction(async (connection) => {
    const job = await assertJobExists(connection, jobId, true)
    assertExpensesEditable(job.status)
    const [existing] = await connection.execute<ExpenseIdRow[]>(
      "SELECT id FROM job_expenses WHERE id = ? AND job_id = ? FOR UPDATE",
      [expenseId, jobId]
    )
    if (existing.length === 0) throw new ResourceNotFoundError("Gasto no encontrado para este trabajo")
    await connection.execute(
      `UPDATE job_expenses
       SET expense_date = ?, category = ?, description = ?, amount = ?, note = ?, updated_at = NOW()
       WHERE id = ?`,
      [expense.expense_date, expense.category, expense.description, expense.amount, expense.note || null, expenseId]
    )
  })
  return getJobExpenseById(jobId, expenseId)
}

export async function deleteJobExpense(jobId: string, expenseId: string) {
  await transaction(async (connection) => {
    const job = await assertJobExists(connection, jobId, true)
    assertExpensesEditable(job.status)
    const [existing] = await connection.execute<ExpenseIdRow[]>(
      "SELECT id FROM job_expenses WHERE id = ? AND job_id = ? FOR UPDATE",
      [expenseId, jobId]
    )
    if (existing.length === 0) throw new ResourceNotFoundError("Gasto no encontrado para este trabajo")
    await connection.execute("DELETE FROM job_expenses WHERE id = ?", [expenseId])
  })
}
