import { NextResponse } from "next/server"
import { getJobById, updateJob } from "@/lib/database"
import { badRequest, idSchema, invalidRequest, jobSchema, knownRequestError, serverError } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return invalidRequest(parsedId.error)

  try {
    return NextResponse.json(await getJobById(parsedId.data))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error fetching job:", error)
    return serverError("No se pudo obtener el trabajo")
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
    const parsed = jobSchema.safeParse(body)
    if (!parsed.success) return invalidRequest(parsed.error)

    return NextResponse.json(await updateJob(parsedId.data, parsed.data))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error updating job:", error)
    return serverError("No se pudo actualizar el trabajo")
  }
}
