import { NextResponse } from "next/server"
import { closeJobFinancially, getJobFinancialClose } from "@/lib/database"
import { idSchema, invalidRequest, knownRequestError, serverError } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return invalidRequest(parsedId.error)

  try {
    return NextResponse.json(await getJobFinancialClose(parsedId.data))
  } catch (error) {
    return knownRequestError(error) || serverError("No se pudo obtener el cierre financiero")
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return invalidRequest(parsedId.error)

  try {
    return NextResponse.json(await closeJobFinancially(parsedId.data), { status: 201 })
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error closing job financially:", error)
    return serverError("No se pudo realizar el cierre financiero")
  }
}
