import { NextResponse } from "next/server"
import { getJobs, saveJob } from "@/lib/database"
import { badRequest, invalidRequest, jobCreateSchema, knownRequestError, serverError } from "@/lib/validations"

export async function GET() {
  try {
    return NextResponse.json(await getJobs())
  } catch (error) {
    console.error("Error fetching jobs:", error)
    return serverError("No se pudieron obtener los trabajos")
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest("El cuerpo de la solicitud debe ser JSON valido")
    }
    const parsed = jobCreateSchema.safeParse(body)
    if (!parsed.success) return invalidRequest(parsed.error)

    const { worker_ids, ...job } = parsed.data
    return NextResponse.json(await saveJob(job, worker_ids || []), { status: 201 })
  } catch (error) {
    const knownError = knownRequestError(error)
    if (knownError) return knownError
    console.error("Error saving job:", error)
    return serverError("No se pudo guardar el trabajo")
  }
}
