import { NextResponse } from "next/server"
import { saveFreeDocument, getFreeDocuments } from "@/lib/database"

export async function GET() {
  try {
    const documents = await getFreeDocuments()
    return NextResponse.json(documents)
  } catch (error: any) {
    console.error("Error fetching free documents:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener documentos libres" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const document = await saveFreeDocument(body)
    return NextResponse.json(document)
  } catch (error: any) {
    console.error("Error saving free document:", error)
    return NextResponse.json(
      { error: error.message || "Error al guardar el documento libre" },
      { status: 500 }
    )
  }
}
