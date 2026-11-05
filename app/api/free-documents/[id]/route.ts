import { NextResponse } from "next/server"
import { deleteFreeDocument, getFreeDocumentById, updateFreeDocument } from "@/lib/database"
import { freeDocumentSchema, invalidRequest, serverError } from "@/lib/validations"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const document = await getFreeDocumentById(id)
    return NextResponse.json(document)
  } catch (error) {
    console.error("Error fetching free document:", error)
    return serverError("No se pudo obtener el documento libre")
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const parsed = freeDocumentSchema.safeParse(await request.json())
    if (!parsed.success) return invalidRequest(parsed.error)

    const document = await updateFreeDocument(id, parsed.data)
    return NextResponse.json(document)
  } catch (error) {
    console.error("Error updating free document:", error)
    return serverError("No se pudo actualizar el documento libre")
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteFreeDocument(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting free document:", error)
    return serverError("No se pudo eliminar el documento libre")
  }
}
