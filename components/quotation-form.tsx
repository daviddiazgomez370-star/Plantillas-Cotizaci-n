"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { calculateProductPrice, DEFAULT_ACCESSORIES, PRODUCT_TYPES } from "@/lib/pricing"
import { generateQuotationPDF } from "@/lib/pdf-generator"
import { ClientSelector } from "@/components/client-selector"
import { Download, Plus, Trash2, ArrowLeft, Save } from "lucide-react"

interface QuotationItem {
  id: string
  productType: string
  width: number
  height: number
  quantity: number
  description: string
  system?: string // Para puertas batientes y cabinas de baño
  glassThickness?: string
}

export function QuotationForm() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState("")
  const [companyNit, setCompanyNit] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientNit, setClientNit] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [deliveryDays, setDeliveryDays] = useState("15")
  const [warrantyMonths, setWarrantyMonths] = useState("12")
  const [notes, setNotes] = useState("")
  const [workStartDate, setWorkStartDate] = useState("")
  const [workEndDate, setWorkEndDate] = useState("")
  const [items, setItems] = useState<QuotationItem[]>([
    { id: "1", productType: "", width: 0, height: 0, quantity: 1, description: "" },
  ])
  const [isSaving, setIsSaving] = useState(false)

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), productType: "", width: 0, height: 0, quantity: 1, description: "" },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      if (!item.productType || !item.width || !item.height) return total
      const price = calculateProductPrice(item.productType, item.width, item.height, DEFAULT_ACCESSORIES)
      return total + price.total * item.quantity
    }, 0)
  }

  const buildQuotationPayload = (total: number) => {
    const productsData = items
      .filter((item) => item.productType && item.width && item.height)
      .map((item) => ({
        ...item,
        pricing: calculateProductPrice(item.productType, item.width, item.height, DEFAULT_ACCESSORIES),
        productName: getProductName(item.productType),
      }))

    return {
      company_name: companyName,
      company_nit: companyNit,
      company_address: companyAddress,
      company_phone: clientPhone,
      company_email: companyEmail,
      client_name: clientName,
      client_nit: clientNit,
      client_address: clientAddress,
      client_phone: clientPhone,
      client_email: clientEmail,
      products: productsData,
      subtotal: total,
      iva: 0,
      total: total,
      delivery_time: `${deliveryDays} días`,
      warranty: `${warrantyMonths} meses`,
      observations: notes,
      work_start_date: workStartDate || null,
      work_end_date: workEndDate || null,
      status: "pending",
    }
  }

  const saveQuotationToDatabase = async (total: number) => {
    const response = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildQuotationPayload(total)),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al guardar")
    }

    return response.json()
  }

  const handleSaveQuotation = async () => {
    setIsSaving(true)
    try {
      await saveQuotationToDatabase(calculateTotal())
      alert("Cotización guardada exitosamente en el portafolio")
      router.push("/portafolio")
    } catch (error) {
      console.error("Error:", error)
      alert(error instanceof Error ? error.message : "Error al guardar la cotización")
    } finally {
      setIsSaving(false)
    }
  }

  const handleGeneratePDF = async () => {
    const total = calculateTotal()

    const quotationData = {
      companyName,
      clientName,
      clientPhone,
      clientAddress,
      deliveryDays: Number.parseInt(deliveryDays),
      warrantyMonths: Number.parseInt(warrantyMonths),
      notes,
      items: items
        .filter((item) => item.productType && item.width && item.height)
        .map((item) => ({
          ...item,
          pricing: calculateProductPrice(item.productType, item.width, item.height, DEFAULT_ACCESSORIES),
        })),
      total,
      date: new Date().toLocaleDateString("es-ES"),
      quotationNumber: `COT-${Date.now()}`,
    }

    // Genera y descarga el PDF (muestra el total del documento)
    generateQuotationPDF(quotationData)

    // Guarda la cotización en la base de datos
    try {
      await saveQuotationToDatabase(total)
    } catch (error) {
      console.error("Error al guardar la cotización:", error)
      alert(
        error instanceof Error
          ? `El PDF se descargó, pero hubo un error al guardar en la base de datos: ${error.message}`
          : "El PDF se descargó, pero hubo un error al guardar en la base de datos",
      )
    }
  }

  const getProductName = (type: string) => {
    const names: Record<string, string> = {
      "ventana-corrediza": "Ventana Corrediza",
      "ventana-fija": "Ventana Fija",
      "puerta-vidriera": "Puerta Vidriera",
      "puerta-batiente": "Puerta Batiente",
      "fijo-batiente": "Fijo Batiente",
      "cabina-baño": "Cabina de Baño",
    }
    return names[type] || type
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Regresar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de tu Empresa</CardTitle>
          <CardDescription>Datos de tu empresa para la cotización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de tu Empresa</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Tu Empresa SAS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyNit">NIT de tu Empresa</Label>
              <Input
                id="companyNit"
                value={companyNit}
                onChange={(e) => setCompanyNit(e.target.value)}
                placeholder="900123456-7"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Dirección de tu Empresa</Label>
              <Input
                id="companyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Calle 123 # 45-67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email de tu Empresa</Label>
              <Input
                id="companyEmail"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="contacto@tuempresa.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
          <CardDescription>Datos del cliente y términos de la cotización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientSelector
            onSelect={(client) => {
              setClientName(client.name || "")
              setClientNit(client.nit || "")
              setClientPhone(client.phone || "")
              setClientAddress(client.address || "")
              setClientEmail(client.email || "")
            }}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre del Cliente</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientNit">NIT / CC del Cliente</Label>
              <Input
                id="clientNit"
                value={clientNit}
                onChange={(e) => setClientNit(e.target.value)}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Teléfono</Label>
              <Input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="3001234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientAddress">Dirección</Label>
              <Input
                id="clientAddress"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Calle 123 # 45-67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email del Cliente</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryDays">Plazo de Entrega (días)</Label>
              <Input
                id="deliveryDays"
                type="number"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warrantyMonths">Garantía (meses)</Label>
              <Input
                id="warrantyMonths"
                type="number"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                placeholder="12"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workStartDate">Fecha Estimada de Inicio</Label>
              <Input
                id="workStartDate"
                type="date"
                value={workStartDate}
                onChange={(e) => setWorkStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workEndDate">Fecha Estimada de Finalización</Label>
              <Input
                id="workEndDate"
                type="date"
                value={workEndDate}
                onChange={(e) => setWorkEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condiciones especiales, forma de pago, etc."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>Agrega los productos a cotizar con sus medidas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Producto {index + 1}</h3>
                {items.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Tipo de Producto</Label>
                  <Select value={item.productType} onValueChange={(value) => updateItem(item.id, "productType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((type) => (
                        <SelectItem key={type.type} value={type.type}>
                          {getProductName(type.type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ancho (cm)</Label>
                  <Input
                    type="number"
                    value={item.width || ""}
                    onChange={(e) => updateItem(item.id, "width", Number.parseFloat(e.target.value) || 0)}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alto (cm)</Label>
                  <Input
                    type="number"
                    value={item.height || ""}
                    onChange={(e) => updateItem(item.id, "height", Number.parseFloat(e.target.value) || 0)}
                    placeholder="150"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                    placeholder="1"
                    min="1"
                  />
                </div>
              </div>

              {item.productType === "puerta-batiente" && (
                <div className="space-y-2">
                  <Label>Sistema de Puerta Batiente</Label>
                  <Select value={item.system || ""} onValueChange={(value) => updateItem(item.id, "system", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el sistema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="744">Sistema 744</SelectItem>
                      <SelectItem value="8025">Sistema 8025</SelectItem>
                      <SelectItem value="7038">Sistema 7038</SelectItem>
                      <SelectItem value="3831">Sistema 3831</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {item.productType === "cabina-baño" && (
                <div className="space-y-2">
                  <Label>Sistema de Cabina de Baño</Label>
                  <Select value={item.system || ""} onValueChange={(value) => updateItem(item.id, "system", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el sistema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deslizante">Deslizante</SelectItem>
                      <SelectItem value="primavera">Primavera</SelectItem>
                      <SelectItem value="fijo-corredizo">Fijo Corredizo</SelectItem>
                      <SelectItem value="fijo-batiente">Fijo Batiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(item.productType === "ventana-corrediza" ||
                item.productType === "ventana-fija" ||
                item.productType === "puerta-vidriera" ||
                item.productType === "fijo-batiente" ||
                item.productType === "cabina-baño") && (
                <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                  <h4 className="text-sm font-medium text-foreground">Grosor del Vidrio</h4>
                  <div className="space-y-2">
                    <Label className="text-sm">Seleccione el grosor del vidrio</Label>
                    <Select
                      value={item.glassThickness || ""}
                      onValueChange={(value) => updateItem(item.id, "glassThickness", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione grosor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4mm">4mm</SelectItem>
                        <SelectItem value="6mm">6mm</SelectItem>
                        <SelectItem value="8mm">8mm</SelectItem>
                        <SelectItem value="10mm">10mm</SelectItem>
                        <SelectItem value="12mm">12mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {item.glassThickness && (
                    <p className="text-sm text-muted-foreground">Vidrio seleccionado: {item.glassThickness}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Descripción Adicional (opcional)</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  placeholder="Color blanco, con malla mosquitera, etc."
                />
              </div>
              {item.productType && item.width && item.height && (
                <div className="rounded-lg bg-muted p-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Área:</span>
                    <span className="font-medium">{((item.width * item.height) / 10000).toFixed(2)} m²</span>
                  </div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Precio unitario:</span>
                    <span className="font-medium">
                      $
                      {calculateProductPrice(
                        item.productType,
                        item.width,
                        item.height,
                        DEFAULT_ACCESSORIES,
                      ).total.toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Subtotal:</span>
                    <span className="text-accent">
                      $
                      {(
                        calculateProductPrice(item.productType, item.width, item.height, DEFAULT_ACCESSORIES).total *
                        item.quantity
                      ).toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" onClick={addItem} className="w-full bg-transparent">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Producto
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Cotización</p>
              <p className="text-3xl font-bold text-accent">${calculateTotal().toLocaleString("es-CO")}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveQuotation}
                size="lg"
                disabled={!clientName || items.some((i) => !i.productType) || isSaving}
                variant="outline"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Guardando..." : "Guardar en Portafolio"}
              </Button>
              <Button onClick={handleGeneratePDF} size="lg" disabled={!clientName || items.some((i) => !i.productType)}>
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
