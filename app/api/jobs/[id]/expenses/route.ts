import { NextResponse } from "next/server"
import { getJobExpenses, saveJobExpense } from "@/lib/database"
import { badRequest, expenseFiltersSchema, idSchema, invalidRequest, jobExpenseSchema, knownRequestError, serverError } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return invalidRequest(parsedId.error)
  const parsedFilters = expenseFiltersSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()))
  if (!parsedFilters.success) return invalidRequest(parsedFilters.error)

  try {
    return NextResponse.json(await getJobExpenses(parsedId.data, parsedFilters.data))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error fetching job expenses:", error)
    return serverError("No se pudieron obtener los gastos del trabajo")
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
  const parsed = jobExpenseSchema.safeParse(body)
  if (!parsed.success) return invalidRequest(parsed.error)

  try {
    return NextResponse.json(await saveJobExpense(parsedId.data, parsed.data), { status: 201 })
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error saving job expense:", error)
    return serverError("No se pudo registrar el gasto")
  }
}
