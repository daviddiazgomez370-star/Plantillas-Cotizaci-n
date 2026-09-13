import { NextResponse } from "next/server"
import { saveQuotation, getQuotations } from "@/lib/database"

export async function GET() {
  try {
    const quotations = await getQuotations()
    return NextResponse.json(quotations)
  } catch (error: any) {
    console.error("Error fetching quotations:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener cotizaciones" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const quotation = await saveQuotation(body)
    return NextResponse.json(quotation)
  } catch (error: any) {
    console.error("Error saving quotation:", error)
    return NextResponse.json(
      { error: error.message || "Error al guardar la cotizacion" },
      { status: 500 }
    )
  }
}
