import { NextResponse } from "next/server"
import { deleteJobExpense, updateJobExpense } from "@/lib/database"
import { badRequest, idSchema, invalidRequest, jobExpenseSchema, knownRequestError, serverError } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string; expenseId: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, expenseId } = await params
  const parsedJobId = idSchema.safeParse(id)
  if (!parsedJobId.success) return invalidRequest(parsedJobId.error)
  const parsedExpenseId = idSchema.safeParse(expenseId)
  if (!parsedExpenseId.success) return invalidRequest(parsedExpenseId.error)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest("El cuerpo de la solicitud debe ser JSON valido")
  }
  const parsed = jobExpenseSchema.safeParse(body)
  if (!parsed.success) return invalidRequest(parsed.error)

  try {
    return NextResponse.json(await updateJobExpense(parsedJobId.data, parsedExpenseId.data, parsed.data))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error updating job expense:", error)
    return serverError("No se pudo actualizar el gasto")
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, expenseId } = await params
  const parsedJobId = idSchema.safeParse(id)
  if (!parsedJobId.success) return invalidRequest(parsedJobId.error)
  const parsedExpenseId = idSchema.safeParse(expenseId)
  if (!parsedExpenseId.success) return invalidRequest(parsedExpenseId.error)

  try {
    await deleteJobExpense(parsedJobId.data, parsedExpenseId.data)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error deleting job expense:", error)
    return serverError("No se pudo eliminar el gasto")
  }
}
