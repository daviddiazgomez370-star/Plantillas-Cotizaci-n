import { NextResponse } from "next/server"
import { getWorkers, saveWorker } from "@/lib/database"
import { badRequest, invalidRequest, knownRequestError, serverError, workerSchema } from "@/lib/validations"

export async function GET() {
  try {
    return NextResponse.json(await getWorkers())
  } catch (error) {
    console.error("Error fetching workers:", error)
    return serverError("No se pudieron obtener los trabajadores")
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest("El cuerpo de la solicitud debe ser JSON valido")
    }
    const parsed = workerSchema.safeParse(body)
    if (!parsed.success) return invalidRequest(parsed.error)

    const worker = await saveWorker(parsed.data)
    return NextResponse.json(worker, { status: 201 })
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error saving worker:", error)
    return serverError("No se pudo guardar el trabajador")
  }
}
