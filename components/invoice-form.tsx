"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { ClientSelector } from "@/components/client-selector"
import { Download, Plus, Trash2, ArrowLeft, Save } from "lucide-react"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export function InvoiceForm() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientId, setClientId] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [workStartDate, setWorkStartDate] = useState("")
  const [workEndDate, setWorkEndDate] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([{ id: "1", description: "", quantity: 1, unitPrice: 0 }])
  const [isSaving, setIsSaving] = useState(false)
  const searchParams = useSearchParams()
  const editId = searchParams.get("id")
  const [isEditing, setIsEditing] = useState(false)
  const [loadingInvoice, setLoadingInvoice] = useState(false)

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0 }])
  }

  // Cargar cuenta de cobro existente para edicion
  useEffect(() => {
    if (!editId) return
    setLoadingInvoice(true)
    fetch(`/api/invoices/${editId}`)
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar la cuenta de cobro")
        return res.json()
      })
      .then((inv: any) => {
        setIsEditing(true)
        setCompanyName(inv.company_name || "")
        setCompanyId(inv.company_nit || "")
        setCompanyAddress(inv.company_address || "")
        setCompanyPhone(inv.company_phone || "")
        setCompanyEmail(inv.company_email || "")
        setClientName(inv.client_name || "")
        setClientId(inv.client_nit || "")
        setClientAddress(inv.client_address || "")
        setClientPhone(inv.client_phone || "")
        setClientEmail(inv.client_email || "")
        setWorkStartDate(inv.work_start_date || "")
        setWorkEndDate(inv.work_end_date || "")
        setPaymentDate(inv.payment_date || "")
        setPaymentTerms(inv.payment_method || "")
        if (Array.isArray(inv.products) && inv.products.length > 0) {
          setItems(
            inv.products.map((it: any, idx: number) => ({
              id: it.id || `${Date.now()}-${idx}`,
              description: it.description || "",
              quantity: it.quantity ?? 1,
              unitPrice: it.unitPrice ?? 0,
            }))
          )
        }
      })
      .catch((error: any) => {
        console.error("Error al cargar la cuenta de cobro:", error)
        alert(`Error al cargar la cuenta de cobro: ${error.message}`)
      })
      .finally(() => setLoadingInvoice(false))
  }, [editId])

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  }

  const handleSaveInvoice = async () => {
    setIsSaving(true)
    try {
      const total = calculateTotal()

      const invoiceData = {
        company_name: companyName,
        company_nit: companyId,
        company_address: companyAddress,
        company_phone: companyPhone,
        company_email: companyEmail,
        client_name: clientName,
        client_nit: clientId,
        client_address: clientAddress,
        client_phone: clientPhone,
        client_email: clientEmail,
        products: items,
        subtotal: total,
        iva: 0,
        total: total,
        work_start_date: workStartDate || null,
        work_end_date: workEndDate || null,
        payment_date: paymentDate || null,
        payment_method: paymentTerms,
      }

      const response = await fetch(
        isEditing && editId ? `/api/invoices/${editId}` : "/api/invoices",
        {
          method: isEditing && editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoiceData),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al guardar")
      }

      alert(
        isEditing
          ? "Cuenta de cobro actualizada exitosamente"
          : "Cuenta de cobro guardada exitosamente en el portafolio"
      )
      router.push("/portafolio")
    } catch (error) {
      console.error("Error:", error)
      alert(error instanceof Error ? error.message : "Error al guardar la cuenta de cobro")
    } finally {
      setIsSaving(false)
    }
  }

  const handleGeneratePDF = () => {
    const filteredItems = items.filter((item) => item.description.trim() !== "")

    if (filteredItems.length === 0) {
      alert("Debes agregar al menos un item con descripcion para generar el PDF.")
      return
    }

    const invoiceData = {
      companyName,
      companyId,
      companyAddress,
      companyPhone,
      companyEmail,
      clientName,
      clientId,
      clientAddress,
      clientPhone,
      clientEmail,
      paymentTerms,
      items: filteredItems,
      total: calculateTotal(),
      date: new Date().toLocaleDateString("es-ES"),
      invoiceNumber: `CC-${Date.now()}`,
    }

    generateInvoicePDF(invoiceData)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push(isEditing ? "/portafolio" : "/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {isEditing ? "Volver al portafolio" : "Regresar"}
        </Button>
      </div>

      {loadingInvoice && (
        <p className="text-sm text-muted-foreground">Cargando cuenta de cobro...</p>
      )}
      {isEditing && !loadingInvoice && (
        <p className="text-sm text-muted-foreground">
          Editando cuenta de cobro existente. Los cambios se guardaran sobre el mismo documento.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos de tu Empresa</CardTitle>
          <CardDescription>Información del prestador del servicio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre o Razón Social</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Tu Empresa SAS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyId">NIT / CC</Label>
              <Input
                id="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="900123456-7"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Dirección</Label>
              <Input
                id="companyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Calle 123 # 45-67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Teléfono</Label>
              <Input
                id="companyPhone"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="3001234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email</Label>
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
          <CardTitle>Datos del Cliente</CardTitle>
          <CardDescription>Información de quien recibe el servicio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientSelector
            onSelect={(client) => {
              setClientName(client.name || "")
              setClientId(client.nit || "")
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
              <Label htmlFor="clientId">NIT / CC</Label>
              <Input
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientAddress">Dirección</Label>
              <Input
                id="clientAddress"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Calle 456 # 78-90"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Teléfono</Label>
              <Input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="3009876543"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="workStartDate">Fecha de Inicio del Trabajo</Label>
              <Input
                id="workStartDate"
                type="date"
                value={workStartDate}
                onChange={(e) => setWorkStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workEndDate">Fecha de Finalización</Label>
              <Input
                id="workEndDate"
                type="date"
                value={workEndDate}
                onChange={(e) => setWorkEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Fecha de Pago</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Forma de Pago</Label>
            <Input
              id="paymentTerms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Transferencia bancaria - 50% anticipo, 50% contra entrega"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Servicios / Productos</CardTitle>
          <CardDescription>Items a cobrar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Item {index + 1}</h3>
                {items.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                  <Label>Descripción</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    placeholder="Ventana corrediza 1.00m x 1.50m"
                    rows={2}
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
                <div className="space-y-2">
                  <Label>Precio Unitario</Label>
                  <Input
                    type="number"
                    value={item.unitPrice || ""}
                    onChange={(e) => updateItem(item.id, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                    placeholder="250000"
                  />
                </div>
              </div>
              {item.unitPrice > 0 && (
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex justify-between font-semibold">
                    <span>Subtotal:</span>
                    <span className="text-accent">${(item.quantity * item.unitPrice).toLocaleString("es-CO")}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" onClick={addItem} className="w-full bg-transparent">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total a Cobrar</p>
              <p className="text-3xl font-bold text-accent">${calculateTotal().toLocaleString("es-CO")}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveInvoice}
                size="lg"
                disabled={!companyName || !clientName || items.some((i) => !i.description || !i.unitPrice) || isSaving}
                variant="outline"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Guardar en Portafolio"}
              </Button>
              <Button
                onClick={handleGeneratePDF}
                size="lg"
                disabled={!companyName || !clientName || items.some((i) => !i.description || !i.unitPrice)}
              >
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
