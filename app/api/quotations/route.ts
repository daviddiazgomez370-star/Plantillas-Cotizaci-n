import { NextResponse } from "next/server"
import { saveQuotation, getQuotations } from "@/lib/database"
import { invalidRequest, quotationSchema, serverError } from "@/lib/validations"

export async function GET() {
  try {
    const quotations = await getQuotations()
    return NextResponse.json(quotations)
  } catch (error) {
    console.error("Error fetching quotations:", error)
    return serverError("No se pudieron obtener las cotizaciones")
  }
}

export async function POST(request: Request) {
  try {
    const parsed = quotationSchema.safeParse(await request.json())
    if (!parsed.success) return invalidRequest(parsed.error)

    const quotation = await saveQuotation(parsed.data)
    return NextResponse.json(quotation)
  } catch (error) {
    console.error("Error saving quotation:", error)
    return serverError("No se pudo guardar la cotización")
  }
}
