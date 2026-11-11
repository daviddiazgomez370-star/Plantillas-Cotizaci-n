import { NextResponse } from "next/server"
import { getJobAttendance, saveJobAttendance } from "@/lib/database"
import {
  attendanceBatchSchema,
  attendanceFiltersSchema,
  badRequest,
  idSchema,
  invalidRequest,
  knownRequestError,
  serverError,
} from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return invalidRequest(parsedId.error)

  const query = Object.fromEntries(new URL(request.url).searchParams.entries())
  const parsedFilters = attendanceFiltersSchema.safeParse(query)
  if (!parsedFilters.success) return invalidRequest(parsedFilters.error)

  try {
    return NextResponse.json(await getJobAttendance(parsedId.data, parsedFilters.data))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error fetching job attendance:", error)
    return serverError("No se pudo obtener la asistencia del trabajo")
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return invalidRequest(parsedId.error)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest("El cuerpo de la solicitud debe ser JSON valido")
  }

  const parsed = attendanceBatchSchema.safeParse(body)
  if (!parsed.success) return invalidRequest(parsed.error)

  try {
    const result = await saveJobAttendance(parsedId.data, parsed.data)
    return NextResponse.json(result, { status: result.updated > 0 ? 200 : 201 })
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error saving job attendance:", error)
    return serverError("No se pudo guardar la asistencia del trabajo")
  }
}
