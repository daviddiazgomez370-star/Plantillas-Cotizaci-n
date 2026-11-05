# Instrucciones para Configurar la Base de Datos en XAMPP

## Paso 1: Instalar y Abrir XAMPP

1. Si no tienes XAMPP instalado, descárgalo desde: https://www.apachefriends.org/
2. Instala XAMPP en tu computadora
3. Abre el "Panel de Control de XAMPP"
4. Inicia los módulos **Apache** y **MySQL** haciendo clic en "Start" junto a cada uno

![XAMPP Panel de Control](https://i.imgur.com/example.png)

## Paso 2: Acceder a phpMyAdmin

1. Una vez que MySQL esté corriendo (el botón debe estar en verde)
2. Abre tu navegador web
3. Escribe en la barra de direcciones: `http://localhost/phpmyadmin`
4. Presiona Enter
5. Se abrirá la interfaz de phpMyAdmin

## Configuración recomendada: migraciones versionadas

Después de crear el archivo `.env.local` descrito en el Paso 5, usa estos comandos desde la raíz del proyecto:

```bash
# Comprueba las migraciones disponibles sin conectarse ni modificar datos
npm run db:migrate:dry-run

# Crea la base de datos si hace falta y aplica solo las migraciones pendientes
npm run db:migrate

# Consulta cuáles ya fueron aplicadas
npm run db:migrate:status
```

El comando guarda el historial en la tabla `schema_migrations`. No edites una migración que ya se haya aplicado; para un cambio nuevo crea otro archivo numerado dentro de `scripts/migrations/`.

Para instalaciones nuevas o existentes, este es el método recomendado. No combines este flujo con la ejecución manual de los scripts SQL en phpMyAdmin.

## Paso 3: Crear la Base de Datos manualmente (método legado)

### Opción A: Usando el Script SQL Completo

1. En phpMyAdmin, haz clic en la pestaña **"SQL"** en el menú superior
2. Copia todo el contenido del archivo `scripts/mysql_create_tables.sql`
3. Pégalo en el área de texto de phpMyAdmin
4. Haz clic en el botón **"Continuar"** o **"Go"** en la esquina inferior derecha
5. Verás un mensaje de éxito en verde: "Se ha creado la base de datos cotizaciones_db"

### Opción B: Paso por Paso Manual

1. **Crear la base de datos:**
   - En phpMyAdmin, haz clic en **"Nueva"** en el menú lateral izquierdo
   - Escribe el nombre: `cotizaciones_db`
   - En "Cotejamiento" selecciona: `utf8mb4_unicode_ci`
   - Haz clic en **"Crear"**

2. **Crear las tablas:**
   - Selecciona la base de datos `cotizaciones_db` en el menú lateral
   - Haz clic en la pestaña **"SQL"**
   - Copia y pega todo el contenido del archivo `scripts/mysql_create_tables.sql` (desde la línea "CREATE TABLE IF NOT EXISTS quotations..." hasta el final)
   - Haz clic en **"Continuar"**

## Paso 4: Verificar que las Tablas se Crearon Correctamente

1. En el menú lateral izquierdo, haz clic en `cotizaciones_db`
2. Deberías ver tres tablas:
   - **quotations** (cotizaciones)
   - **invoices** (cuentas de cobro)
   - **free_documents** (documentos libres)
3. Haz clic en cada tabla para ver su estructura

### Estructura de la tabla "quotations":
- Debería tener columnas como: id, created_at, company_name, client_name, products, subtotal, total, status, etc.

### Estructura de la tabla "invoices":
- Debería tener columnas como: id, created_at, quotation_id, company_name, client_name, products, subtotal, total, payment_date, etc.

### Estructura de la tabla "free_documents":
- Debería tener columnas como: id, created_at, document_title, document_number, client_name, items, total, document_date y status.

## Paso 5: Configurar Variables de Entorno

Ahora necesitas configurar las variables de entorno para que tu aplicación se conecte a MySQL:

1. Crea un archivo `.env.local` en la raíz de tu proyecto (si no existe)
2. Agrega las siguientes variables:

```env
# Configuración de MySQL en XAMPP
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=cotizaciones_db
```

**Nota:** Por defecto, XAMPP viene con el usuario `root` sin contraseña. Si configuraste una contraseña, reemplaza `DB_PASSWORD=` con tu contraseña.

## Paso 6: Probar la Conexión

1. Inicia tu aplicación Next.js: `npm run dev`
2. Abre la aplicación en tu navegador: `http://localhost:3000`
3. Intenta crear una nueva cotización
4. Si todo funciona correctamente, deberías poder:
   - Crear cotizaciones
   - Ver el portafolio
   - Convertir cotizaciones a cuentas de cobro

## Solución de Problemas Comunes

### Error: "No se puede conectar a MySQL"
- **Solución:** Asegúrate de que el módulo MySQL esté iniciado en el Panel de Control de XAMPP (debe estar en verde)

### Error: "Access denied for user 'root'@'localhost'"
- **Solución:** Verifica que la contraseña en `.env.local` sea correcta. Por defecto es vacía.

### Error: "Base de datos no existe"
- **Solución:** Asegúrate de haber ejecutado el script SQL completo para crear la base de datos `cotizaciones_db`

### Las tablas no se crearon
- **Solución:** Copia el contenido del archivo `scripts/mysql_create_tables.sql` y ejecútalo nuevamente en phpMyAdmin

## Paso 7: Mantenimiento

### Ver los datos guardados:
1. Abre phpMyAdmin: `http://localhost/phpmyadmin`
2. Selecciona `cotizaciones_db` en el menú lateral
3. Haz clic en la tabla que deseas ver (quotations o invoices)
4. Haz clic en la pestaña **"Examinar"** para ver todos los registros

### Limpiar datos de prueba:
1. En phpMyAdmin, selecciona la tabla
2. Haz clic en **"Operaciones"**
3. Desplázate hacia abajo y haz clic en **"Vaciar la tabla (TRUNCATE)"**
4. Confirma la acción

### Respaldar la base de datos:
1. En phpMyAdmin, selecciona `cotizaciones_db`
2. Haz clic en la pestaña **"Exportar"**
3. Selecciona "Método rápido"
4. Haz clic en **"Continuar"**
5. Se descargará un archivo `.sql` con tu respaldo

## Actualización manual: conversión de documentos libres

Si no vas a usar `npm run db:migrate` y ya tienes la base de datos creada,
ejecuta una sola vez el archivo `scripts/004_track_free_document_conversions.sql`
desde la pestaña **SQL** de phpMyAdmin. Esto agrega el estado de los documentos
libres y evita que un mismo documento se convierta dos veces en cuenta de cobro.

---

**¡Listo!** Ya tienes tu base de datos configurada y funcionando con XAMPP.
