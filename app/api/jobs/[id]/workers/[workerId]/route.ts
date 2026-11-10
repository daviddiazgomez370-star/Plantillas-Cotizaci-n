import { NextResponse } from "next/server"
import { removeWorkerFromJob } from "@/lib/database"
import { idSchema, invalidRequest, knownRequestError, serverError } from "@/lib/validations"

type RouteContext = { params: Promise<{ id: string; workerId: string }> }

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, workerId } = await params
  const parsedJobId = idSchema.safeParse(id)
  if (!parsedJobId.success) return invalidRequest(parsedJobId.error)
  const parsedWorkerId = idSchema.safeParse(workerId)
  if (!parsedWorkerId.success) return invalidRequest(parsedWorkerId.error)

  try {
    return NextResponse.json(await removeWorkerFromJob(parsedJobId.data, parsedWorkerId.data))
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error removing worker from job:", error)
    return serverError("No se pudo quitar el trabajador del trabajo")
  }
}
