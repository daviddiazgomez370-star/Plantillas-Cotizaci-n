import { NextResponse } from "next/server"
import { deleteQuotation } from "@/lib/database"
import { idSchema, invalidRequest, knownRequestError, serverError } from "@/lib/validations"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const parsedId = idSchema.safeParse(id)
    if (!parsedId.success) return invalidRequest(parsedId.error)

    await deleteQuotation(parsedId.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error deleting quotation:", error)
    return serverError("No se pudo eliminar la cotización")
  }
}
