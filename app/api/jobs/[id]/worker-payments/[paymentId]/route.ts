import { NextResponse } from "next/server"
import { deleteWorkerPayment, getJobWorkerPayments } from "@/lib/database"
import { idSchema, invalidRequest, knownRequestError, serverError } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string; paymentId: string }> }

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, paymentId } = await params
  const parsedJobId = idSchema.safeParse(id)
  if (!parsedJobId.success) return invalidRequest(parsedJobId.error)
  const parsedPaymentId = idSchema.safeParse(paymentId)
  if (!parsedPaymentId.success) return invalidRequest(parsedPaymentId.error)

  try {
    await deleteWorkerPayment(parsedJobId.data, parsedPaymentId.data)
    return NextResponse.json(await getJobWorkerPayments(parsedJobId.data))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error deleting worker payment:", error)
    return serverError("No se pudo eliminar el pago al trabajador")
  }
}
