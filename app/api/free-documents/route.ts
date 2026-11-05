import { NextResponse } from "next/server"
import { saveFreeDocument, getFreeDocuments } from "@/lib/database"
import { freeDocumentSchema, invalidRequest, serverError } from "@/lib/validations"

export async function GET() {
  try {
    const documents = await getFreeDocuments()
    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error fetching free documents:", error)
    return serverError("No se pudieron obtener los documentos libres")
  }
}

export async function POST(request: Request) {
  try {
    const parsed = freeDocumentSchema.safeParse(await request.json())
    if (!parsed.success) return invalidRequest(parsed.error)

    const document = await saveFreeDocument(parsed.data)
    return NextResponse.json(document)
  } catch (error) {
    console.error("Error saving free document:", error)
    return serverError("No se pudo guardar el documento libre")
  }
}
