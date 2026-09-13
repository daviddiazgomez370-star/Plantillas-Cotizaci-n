import { NextResponse } from "next/server"
import { deleteInvoice, getInvoiceById, updateInvoice } from "@/lib/database"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const invoice = await getInvoiceById(id)
    return NextResponse.json(invoice)
  } catch (error: any) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener la cuenta de cobro" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const invoice = await updateInvoice(id, body)
    return NextResponse.json(invoice)
  } catch (error: any) {
    console.error("Error updating invoice:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar la cuenta de cobro" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteInvoice(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json({ error: "Error al eliminar la cuenta de cobro" }, { status: 500 })
  }
}
