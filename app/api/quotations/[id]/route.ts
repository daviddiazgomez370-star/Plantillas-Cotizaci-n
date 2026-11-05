import { NextResponse } from "next/server"
import { deleteQuotation } from "@/lib/database"
import { serverError } from "@/lib/validations"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteQuotation(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting quotation:", error)
    return serverError("No se pudo eliminar la cotización")
  }
}
