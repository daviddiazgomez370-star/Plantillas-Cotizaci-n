import { NextResponse } from "next/server"
import { setWorkerActive } from "@/lib/database"
import { badRequest, idSchema, invalidRequest, knownRequestError, serverError, workerActivationSchema } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
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
    const parsed = workerActivationSchema.safeParse(body)
    if (!parsed.success) return invalidRequest(parsed.error)

    return NextResponse.json(await setWorkerActive(parsedId.data, parsed.data.is_active))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error updating worker status:", error)
    return serverError("No se pudo actualizar el estado del trabajador")
  }
}
