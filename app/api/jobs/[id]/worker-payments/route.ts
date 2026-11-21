import { NextResponse } from "next/server"
import { getJobWorkerPayments, saveWorkerPayment } from "@/lib/database"
import {
  badRequest,
  idSchema,
  invalidRequest,
  knownRequestError,
  serverError,
  workerPaymentSchema,
} from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return invalidRequest(parsedId.error)

  try {
    return NextResponse.json(await getJobWorkerPayments(parsedId.data))
  } catch (error) {
    return knownRequestError(error) || serverError("No se pudieron obtener los pagos al trabajador")
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

  const parsed = workerPaymentSchema.safeParse(body)
  if (!parsed.success) return invalidRequest(parsed.error)

  try {
    await saveWorkerPayment(parsedId.data, parsed.data)
    return NextResponse.json(await getJobWorkerPayments(parsedId.data), { status: 201 })
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error saving worker payment:", error)
    return serverError("No se pudo registrar el pago al trabajador")
  }
}
