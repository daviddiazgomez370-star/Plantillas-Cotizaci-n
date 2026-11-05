import { NextResponse } from "next/server"
import { deleteClient, getClientById, updateClient } from "@/lib/database"
import { clientSchema, invalidRequest, serverError } from "@/lib/validations"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await getClientById(id)
    return NextResponse.json(client)
  } catch (error) {
    console.error("Error fetching client:", error)
    return serverError("No se pudo obtener el cliente")
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const parsed = clientSchema.safeParse(await request.json())
    if (!parsed.success) return invalidRequest(parsed.error)

    const client = await updateClient(id, parsed.data)
    return NextResponse.json(client)
  } catch (error) {
    console.error("Error updating client:", error)
    return serverError("No se pudo actualizar el cliente")
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteClient(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting client:", error)
    return serverError("No se pudo eliminar el cliente")
  }
}
