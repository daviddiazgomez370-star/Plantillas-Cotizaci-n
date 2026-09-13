import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: { finalY: number }
  }
}

export function generateQuotationPDF(data: any) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text("COTIZACIÓN", pageWidth / 2, 20, { align: "center" })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`No. ${data.quotationNumber}`, pageWidth / 2, 28, { align: "center" })
  doc.text(`Fecha: ${data.date}`, pageWidth / 2, 34, { align: "center" })

  // Company Info
  doc.setFontSize(12)
  doc.setTextColor(40, 40, 40)
  doc.text(data.companyName || "Tu Empresa", 14, 45)

  // Client Info
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text("CLIENTE:", 14, 55)
  doc.setFontSize(10)
  doc.text(data.clientName, 14, 61)
  doc.text(`Tel: ${data.clientPhone}`, 14, 67)
  doc.text(`Dir: ${data.clientAddress}`, 14, 73)

  // Items Table
  const tableData = data.items.map((item: any, index: number) => {
    const area = ((item.width * item.height) / 10000).toFixed(2)
    const productNames: Record<string, string> = {
      "ventana-corrediza": "Ventana Corrediza",
      "ventana-fija": "Ventana Fija",
      "puerta-vidriera": "Puerta Vidriera",
      "puerta-batiente": "Puerta Batiente",
      "fijo-batiente": "Fijo Batiente",
      "cabina-baño": "Cabina de Baño",
    }

    const systemNames: Record<string, string> = {
      deslizante: "Deslizante",
      primavera: "Primavera",
      "fijo-corredizo": "Fijo Corredizo",
      "fijo-batiente": "Fijo Batiente",
    }

    let description = `${productNames[item.productType]}\n${item.width}cm x ${item.height}cm (${area}m²)`

    if (item.system) {
      const systemName = systemNames[item.system] || `Sistema ${item.system}`
      description += `\nSistema: ${systemName}`
    }

    if (item.glassThickness) {
      description += `\nGrosor del vidrio: ${item.glassThickness}`
    }

    if (item.description) {
      description += `\n${item.description}`
    }

    return [
      index + 1,
      description,
      item.quantity,
      `$${item.pricing.total.toLocaleString("es-CO")}`,
      `$${(item.pricing.total * item.quantity).toLocaleString("es-CO")}`,
    ]
  })

  autoTable(doc, {
    startY: 80,
    head: [["#", "Descripción", "Cant.", "Precio Unit.", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [100, 180, 150] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 80 },
      2: { cellWidth: 20 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
    },
  })

  // Total
  const finalY = (doc as any).lastAutoTable.finalY
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  const total =
    typeof data.total === "number"
      ? data.total
      : data.items.reduce((sum: number, item: any) => sum + item.pricing.total * item.quantity, 0)
  doc.text(`TOTAL DEL DOCUMENTO: $${total.toLocaleString("es-CO")}`, pageWidth - 14, finalY + 15, { align: "right" })

  // Terms
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(`Plazo de entrega: ${data.deliveryDays} días`, 14, finalY + 30)
  doc.text(`Garantía: ${data.warrantyMonths} meses`, 14, finalY + 36)

  let currentY = finalY + 46

  if (data.notes) {
    doc.text("Notas:", 14, currentY)
    doc.setFontSize(9)
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 28)
    doc.text(splitNotes, 14, currentY + 6)
    currentY += 6 + splitNotes.length * 5 + 10
  }

  // Signature section
  const signatureY = Math.max(currentY, finalY + 70)
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)

  // Signature line and text
  doc.line(14, signatureY, 80, signatureY)
  doc.setFontSize(9)
  doc.text("Representante Legal", 14, signatureY + 5)
  doc.text(data.companyName || "Tu Empresa", 14, signatureY + 10)

  // Save
  doc.save(`Cotizacion_${data.quotationNumber}.pdf`)
}

export function generateInvoicePDF(data: any) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  const safeText = (text: any, fallback = ""): string => {
    return text != null ? String(text) : fallback
  }

  // Header
  doc.setFontSize(22)
  doc.setTextColor(40, 40, 40)
  doc.text("CUENTA DE COBRO", pageWidth / 2, 20, { align: "center" })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`No. ${safeText(data.invoiceNumber)}`, pageWidth / 2, 28, { align: "center" })
  doc.text(`Fecha: ${safeText(data.date)}`, pageWidth / 2, 34, { align: "center" })

  // Provider Info
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text("PRESTADOR DEL SERVICIO:", 14, 45)
  doc.setFontSize(10)
  doc.text(safeText(data.company_name || data.companyName), 14, 51)
  doc.text(`NIT/CC: ${safeText(data.company_nit || data.companyId)}`, 14, 57)
  doc.text(`Dir: ${safeText(data.company_address || data.companyAddress)}`, 14, 63)
  doc.text(`Tel: ${safeText(data.company_phone || data.companyPhone)}`, 14, 69)

  // Client Info
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text("CLIENTE:", pageWidth - 80, 45)
  doc.setFontSize(10)
  doc.text(safeText(data.client_name || data.clientName), pageWidth - 80, 51)
  doc.text(`NIT/CC: ${safeText(data.client_nit || data.clientId)}`, pageWidth - 80, 57)

  let tableData: any[] = []

  if (data.products && Array.isArray(data.products)) {
    // Productos desde cotización
    tableData = data.products.map((product: any, index: number) => {
      const productNames: Record<string, string> = {
        "ventana-corrediza": "Ventana Corrediza",
        "ventana-fija": "Ventana Fija",
        "puerta-vidriera": "Puerta Vidriera",
        "puerta-batiente": "Puerta Batiente",
        "fijo-batiente": "Fijo Batiente",
        "cabina-baño": "Cabina de Baño",
      }

      const description = `${productNames[product.productType] || product.productType} - ${product.width}cm x ${product.height}cm`
      const unitPrice = product.pricing?.total || 0
      const quantity = product.quantity || 1

      return [
        index + 1,
        description,
        quantity,
        `$${unitPrice.toLocaleString("es-CO")}`,
        `$${(quantity * unitPrice).toLocaleString("es-CO")}`,
      ]
    })
  } else if (data.items && Array.isArray(data.items)) {
    // Items ya formateados
    tableData = data.items.map((item: any, index: number) => [
      index + 1,
      safeText(item.description),
      item.quantity || 1,
      `$${(item.unitPrice || 0).toLocaleString("es-CO")}`,
      `$${((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString("es-CO")}`,
    ])
  }

  autoTable(doc, {
    startY: 90,
    head: [["#", "Descripción", "Cant.", "Valor Unit.", "Valor Total"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [100, 180, 150] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 90 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
    },
  })

  // Total
  const finalY = (doc as any).lastAutoTable.finalY
  doc.setFontSize(16)
  doc.setTextColor(40, 40, 40)
  const total = data.total || 0
  doc.text(`TOTAL: $${total.toLocaleString("es-CO")}`, pageWidth - 14, finalY + 15, { align: "right" })

  // Payment Terms
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text("FORMA DE PAGO:", 14, finalY + 30)
  doc.setFontSize(9)
  const paymentTerms = safeText(data.payment_method || data.paymentTerms, "A convenir")
  const splitPayment = doc.splitTextToSize(paymentTerms, pageWidth - 28)
  doc.text(splitPayment, 14, finalY + 36)

  const signatureY = finalY + 60

  // Signature line and text
  doc.line(14, signatureY, 80, signatureY)
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text("Representante Legal", 14, signatureY + 5)
  doc.text(safeText(data.company_name || data.companyName), 14, signatureY + 10)
  doc.text(`CC/NIT: ${safeText(data.company_nit || data.companyId)}`, 14, signatureY + 15)

  // Save
  doc.save(`CuentaDeCobro_${safeText(data.invoiceNumber)}.pdf`)
}

export function generateFreeDocumentPDF(data: any) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  const safeText = (text: any, fallback = ""): string => {
    return text != null ? String(text) : fallback
  }

  // Header - Titulo del documento
  doc.setFontSize(22)
  doc.setTextColor(40, 40, 40)
  doc.text(safeText(data.documentTitle, "COTIZACION").toUpperCase(), pageWidth / 2, 20, { align: "center" })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`No. ${safeText(data.documentNumber)}`, pageWidth / 2, 28, { align: "center" })
  doc.text(`Fecha: ${safeText(data.date)}`, pageWidth / 2, 34, { align: "center" })

  // Empresa Info - Lado izquierdo
  doc.setFontSize(11)
  doc.setTextColor(40, 40, 40)
  doc.setFont("helvetica", "bold")
  doc.text("EMPRESA:", 14, 46)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  let companyY = 52
  doc.text(safeText(data.companyName), 14, companyY)
  if (data.companyNit) { companyY += 5; doc.text(`NIT: ${data.companyNit}`, 14, companyY) }
  if (data.companyAddress) { companyY += 5; doc.text(`Dir: ${data.companyAddress}`, 14, companyY) }
  if (data.companyPhone) { companyY += 5; doc.text(`Tel: ${data.companyPhone}`, 14, companyY) }
  if (data.companyEmail) { companyY += 5; doc.text(`Email: ${data.companyEmail}`, 14, companyY) }

  // Cliente Info - Lado derecho
  const rightX = pageWidth / 2 + 10
  doc.setFontSize(11)
  doc.setTextColor(40, 40, 40)
  doc.setFont("helvetica", "bold")
  doc.text("CLIENTE:", rightX, 46)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  let clientY = 52
  doc.text(safeText(data.clientName), rightX, clientY)
  if (data.clientNit) { clientY += 5; doc.text(`NIT/CC: ${data.clientNit}`, rightX, clientY) }
  if (data.clientAddress) { clientY += 5; doc.text(`Dir: ${data.clientAddress}`, rightX, clientY) }
  if (data.clientPhone) { clientY += 5; doc.text(`Tel: ${data.clientPhone}`, rightX, clientY) }
  if (data.clientEmail) { clientY += 5; doc.text(`Email: ${data.clientEmail}`, rightX, clientY) }

  // Descripcion general
  let startY = Math.max(companyY, clientY) + 12

  if (data.generalDescription) {
    doc.setFontSize(10)
    doc.setTextColor(40, 40, 40)
    doc.setFont("helvetica", "bold")
    doc.text("DESCRIPCION:", 14, startY)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    const splitDesc = doc.splitTextToSize(data.generalDescription, pageWidth - 28)
    doc.text(splitDesc, 14, startY + 6)
    startY += 6 + splitDesc.length * 4.5 + 6
  }

  // Tabla de items
  const tableData = data.items.map((item: any, index: number) => [
    index + 1,
    safeText(item.description),
    item.quantity || 1,
    `$${(item.unitPrice || 0).toLocaleString("es-CO")}`,
    `$${((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString("es-CO")}`,
  ])

  autoTable(doc, {
    startY: startY + 2,
    head: [["#", "Descripcion", "Cant.", "Precio Unit.", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [100, 180, 150] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 90 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
    },
    styles: { fontSize: 9 },
  })

  // Total
  const finalY = (doc as any).lastAutoTable.finalY
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.setFont("helvetica", "bold")
  doc.text(`TOTAL: $${(data.total || 0).toLocaleString("es-CO")}`, pageWidth - 14, finalY + 12, { align: "right" })
  doc.setFont("helvetica", "normal")

  // Condiciones
  let condY = finalY + 26
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(`Plazo de entrega: ${data.deliveryDays || 0} dias`, 14, condY)
  condY += 6
  doc.text(`Garantia: ${data.warrantyMonths || 0} meses`, 14, condY)

  // Notas
  if (data.notes) {
    condY += 10
    doc.setFontSize(10)
    doc.setTextColor(40, 40, 40)
    doc.setFont("helvetica", "bold")
    doc.text("NOTAS:", 14, condY)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 28)
    doc.text(splitNotes, 14, condY + 6)
    condY += 6 + splitNotes.length * 4.5
  }

  // Firma del representante legal
  const signatureY = Math.max(condY + 20, finalY + 70)

  // Verificar si necesita nueva pagina
  const pageHeight = doc.internal.pageSize.getHeight()
  if (signatureY + 20 > pageHeight - 20) {
    doc.addPage()
    const newSignY = 30
    doc.setDrawColor(60, 60, 60)
    doc.line(14, newSignY, 80, newSignY)
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text("Representante Legal", 14, newSignY + 5)
    doc.text(safeText(data.companyName), 14, newSignY + 10)
    doc.text(`NIT: ${safeText(data.companyNit)}`, 14, newSignY + 15)
  } else {
    doc.setDrawColor(60, 60, 60)
    doc.line(14, signatureY, 80, signatureY)
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text("Representante Legal", 14, signatureY + 5)
    doc.text(safeText(data.companyName), 14, signatureY + 10)
    doc.text(`NIT: ${safeText(data.companyNit)}`, 14, signatureY + 15)
  }

  // Guardar
  doc.save(`${safeText(data.documentTitle, "Documento").replace(/\s+/g, "_")}_${safeText(data.documentNumber)}.pdf`)
}
