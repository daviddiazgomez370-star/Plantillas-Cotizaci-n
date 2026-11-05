import { NextResponse } from "next/server"
import { getClients, saveClient } from "@/lib/database"
import { clientSchema, invalidRequest, serverError } from "@/lib/validations"

export async function GET() {
  try {
    const clients = await getClients()
    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error fetching clients:", error)
    return serverError("No se pudieron obtener los clientes")
  }
}

export async function POST(request: Request) {
  try {
    const parsed = clientSchema.safeParse(await request.json())
    if (!parsed.success) return invalidRequest(parsed.error)

    const client = await saveClient(parsed.data)
    return NextResponse.json(client)
  } catch (error) {
    console.error("Error saving client:", error)
    return serverError("No se pudo guardar el cliente")
  }
}
