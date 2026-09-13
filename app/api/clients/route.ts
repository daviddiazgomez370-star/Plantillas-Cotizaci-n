import { NextResponse } from "next/server"
import { getClients, saveClient } from "@/lib/database"

export async function GET() {
  try {
    const clients = await getClients()
    return NextResponse.json(clients)
  } catch (error: any) {
    console.error("Error fetching clients:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener clientes" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "El nombre del cliente es obligatorio" }, { status: 400 })
    }
    const client = await saveClient(body)
    return NextResponse.json(client)
  } catch (error: any) {
    console.error("Error saving client:", error)
    return NextResponse.json(
      { error: error.message || "Error al guardar el cliente" },
      { status: 500 }
    )
  }
}
