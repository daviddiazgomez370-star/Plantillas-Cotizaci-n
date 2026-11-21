import { NextResponse } from "next/server"
import { replaceJobProfitShares } from "@/lib/database"
import { badRequest, idSchema, invalidRequest, jobProfitSharesSchema, knownRequestError, serverError } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return invalidRequest(parsedId.error)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest("El cuerpo de la solicitud debe ser JSON valido")
  }
  const parsed = jobProfitSharesSchema.safeParse(body)
  if (!parsed.success) return invalidRequest(parsed.error)

  try {
    return NextResponse.json(await replaceJobProfitShares(parsedId.data, parsed.data))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error saving job profit shares:", error)
    return serverError("No se pudo guardar la configuración de reparto")
  }
}
