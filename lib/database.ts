import { query, generateUUID, transaction } from "./mysql"

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
