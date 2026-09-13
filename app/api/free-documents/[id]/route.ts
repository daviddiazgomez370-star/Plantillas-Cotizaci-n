import { NextResponse } from "next/server"
import { deleteFreeDocument, getFreeDocumentById, updateFreeDocument } from "@/lib/database"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const document = await getFreeDocumentById(id)
    return NextResponse.json(document)
  } catch (error: any) {
    console.error("Error fetching free document:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener el documento" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const document = await updateFreeDocument(id, body)
    return NextResponse.json(document)
  } catch (error: any) {
    console.error("Error updating free document:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar el documento" },
      { status: 500 }
    )
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
    return NextResponse.json(
      { error: error.message || "Error al eliminar el documento" },
      { status: 500 }
    )
  }
}
