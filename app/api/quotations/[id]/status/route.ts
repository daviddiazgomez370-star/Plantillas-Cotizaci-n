import { NextResponse } from "next/server"
import { updateQuotationStatus } from "@/lib/database"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { status } = await request.json()
    const quotation = await updateQuotationStatus(id, status)
    return NextResponse.json(quotation)
  } catch (error) {
    console.error("Error updating quotation status:", error)
    return NextResponse.json({ error: "Error al actualizar el estado" }, { status: 500 })
  }
}
