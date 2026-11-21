import { NextResponse } from "next/server"
import { createJobFromQuotation } from "@/lib/database"
import { badRequest, idSchema, invalidRequest, knownRequestError, quotationJobCreateSchema, serverError } from "@/lib/validations"

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

    const parsed = quotationJobCreateSchema.safeParse(body)
    if (!parsed.success) return invalidRequest(parsed.error)

    return NextResponse.json(await createJobFromQuotation(parsedId.data, parsed.data), { status: 201 })
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error creating job from quotation:", error)
    return serverError("No se pudo crear el trabajo desde la cotizacion")
  }
}
