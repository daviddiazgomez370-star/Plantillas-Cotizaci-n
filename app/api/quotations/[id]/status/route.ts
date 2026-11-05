import { NextResponse } from "next/server"
import { updateQuotationStatus } from "@/lib/database"
import { invalidRequest, quotationStatusSchema, serverError } from "@/lib/validations"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const parsed = quotationStatusSchema.safeParse(await request.json())
    if (!parsed.success) return invalidRequest(parsed.error)

    const quotation = await updateQuotationStatus(id, parsed.data.status)
    return NextResponse.json(quotation)
  } catch (error) {
    console.error("Error updating quotation status:", error)
    return serverError("No se pudo actualizar el estado de la cotización")
  }
}
