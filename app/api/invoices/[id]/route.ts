import { NextResponse } from "next/server"
import { deleteInvoice, getInvoiceById, updateInvoice } from "@/lib/database"
import { invalidRequest, invoiceSchema, normalizeInvoiceRequest, serverError } from "@/lib/validations"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const invoice = await getInvoiceById(id)
    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return serverError("No se pudo obtener la cuenta de cobro")
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const parsed = invoiceSchema.safeParse(normalizeInvoiceRequest(await request.json()))
    if (!parsed.success) return invalidRequest(parsed.error)

    const invoice = await updateInvoice(id, parsed.data)
    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error updating invoice:", error)
    return serverError("No se pudo actualizar la cuenta de cobro")
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteInvoice(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return serverError("No se pudo eliminar la cuenta de cobro")
  }
}
