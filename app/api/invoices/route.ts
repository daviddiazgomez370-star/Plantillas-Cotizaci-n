import { NextResponse } from "next/server"
import { getInvoices, saveInvoice, saveInvoiceFromFreeDocument } from "@/lib/database"
import { invalidRequest, invoiceSchema, normalizeInvoiceRequest, serverError } from "@/lib/validations"

export async function GET() {
  try {
    const invoices = await getInvoices()
    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return serverError("No se pudieron obtener las cuentas de cobro")
  }
}

export async function POST(request: Request) {
  try {
    const parsed = invoiceSchema.safeParse(normalizeInvoiceRequest(await request.json()))
    if (!parsed.success) return invalidRequest(parsed.error)

    const invoice = parsed.data.free_document_id
      ? await saveInvoiceFromFreeDocument(parsed.data)
      : await saveInvoice(parsed.data)
    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error saving invoice:", error)
    if (error instanceof Error && error.message === "Este documento libre ya fue convertido en una cuenta de cobro") {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    return serverError("No se pudo guardar la cuenta de cobro")
  }
}
