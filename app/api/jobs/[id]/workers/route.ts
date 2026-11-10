import { NextResponse } from "next/server"
import { assignWorkersToJob } from "@/lib/database"
import { badRequest, idSchema, invalidRequest, knownRequestError, serverError, workerAssignmentSchema } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
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
    const parsed = workerAssignmentSchema.safeParse(body)
    if (!parsed.success) return invalidRequest(parsed.error)

    return NextResponse.json(await assignWorkersToJob(parsedId.data, parsed.data.worker_ids))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error assigning workers to job:", error)
    return serverError("No se pudieron asignar los trabajadores")
  }
}
