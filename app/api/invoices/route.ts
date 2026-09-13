import { NextResponse } from "next/server"
import { saveInvoice, getInvoices } from "@/lib/database"

export async function GET() {
  try {
    const invoices = await getInvoices()
    return NextResponse.json(invoices)
  } catch (error: any) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener cuentas de cobro" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const invoice = await saveInvoice(body)
    return NextResponse.json(invoice)
  } catch (error: any) {
    console.error("Error saving invoice:", error)
    return NextResponse.json(
      { error: error.message || "Error al guardar la cuenta de cobro" },
      { status: 500 }
    )
  }
}
