import { NextResponse } from "next/server"
import { getWorkerById, updateWorker } from "@/lib/database"
import { badRequest, idSchema, invalidRequest, knownRequestError, serverError, workerSchema } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return invalidRequest(parsedId.error)

  try {
    return NextResponse.json(await getWorkerById(parsedId.data))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error fetching worker:", error)
    return serverError("No se pudo obtener el trabajador")
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return invalidRequest(parsedId.error)

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest("El cuerpo de la solicitud debe ser JSON valido")
    }
    const parsed = workerSchema.safeParse(body)
    if (!parsed.success) return invalidRequest(parsed.error)

    return NextResponse.json(await updateWorker(parsedId.data, parsed.data))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error updating worker:", error)
    return serverError("No se pudo actualizar el trabajador")
  }
}
