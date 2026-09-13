import { NextResponse } from "next/server"
import { deleteClient, getClientById, updateClient } from "@/lib/database"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await getClientById(id)
    return NextResponse.json(client)
  } catch (error: any) {
    console.error("Error fetching client:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener el cliente" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const client = await updateClient(id, body)
    return NextResponse.json(client)
  } catch (error: any) {
    console.error("Error updating client:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar el cliente" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteClient(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting client:", error)
    return NextResponse.json(
      { error: error.message || "Error al eliminar el cliente" },
      { status: 500 }
    )
  }
}
