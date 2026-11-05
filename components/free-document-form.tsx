"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { generateFreeDocumentPDF } from "@/lib/pdf-generator"
import { formatDate, getCurrentDateInputValue, toDateInputValue } from "@/lib/dates"
import { ClientSelector } from "@/components/client-selector"
import { toast } from "@/hooks/use-toast"
import { Download, Plus, Trash2, ArrowLeft, Save } from "lucide-react"

interface DocumentItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export function FreeDocumentForm() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState("")
  const [companyNit, setCompanyNit] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientNit, setClientNit] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [documentTitle, setDocumentTitle] = useState("")
  const [generalDescription, setGeneralDescription] = useState("")
  const [deliveryDays, setDeliveryDays] = useState("15")
  const [warrantyMonths, setWarrantyMonths] = useState("12")
  const [notes, setNotes] = useState("")
  const [documentDate, setDocumentDate] = useState(
    getCurrentDateInputValue()
  )
  const [documentNumber, setDocumentNumber] = useState("")
  const [saving, setSaving] = useState(false)
  const searchParams = useSearchParams()
  const editId = searchParams.get("id")
  const [isEditing, setIsEditing] = useState(false)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [items, setItems] = useState<DocumentItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0 },
  ])

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0 },
    ])
  }

  // Cargar documento existente para edicion
  useEffect(() => {
    if (!editId) return
    setLoadingDoc(true)
    fetch(`/api/free-documents/${editId}`)
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el documento")
        return res.json()
      })
      .then((doc: any) => {
        setIsEditing(true)
        setDocumentTitle(doc.document_title || "")
        setDocumentDate(toDateInputValue(doc.document_date) || getCurrentDateInputValue())
        setDocumentNumber(doc.document_number || "")
        setGeneralDescription(doc.general_description || "")
        setCompanyName(doc.company_name || "")
        setCompanyNit(doc.company_nit || "")
        setCompanyAddress(doc.company_address || "")
        setCompanyPhone(doc.company_phone || "")
        setCompanyEmail(doc.company_email || "")
        setClientName(doc.client_name || "")
        setClientNit(doc.client_nit || "")
        setClientPhone(doc.client_phone || "")
        setClientAddress(doc.client_address || "")
        setClientEmail(doc.client_email || "")
        setDeliveryDays(String(doc.delivery_days ?? 15))
        setWarrantyMonths(String(doc.warranty_months ?? 12))
        setNotes(doc.notes || "")
        if (Array.isArray(doc.items) && doc.items.length > 0) {
          setItems(
            doc.items.map((it: any, idx: number) => ({
              id: it.id || `${Date.now()}-${idx}`,
              description: it.description || "",
              quantity: it.quantity ?? 1,
              unitPrice: it.unitPrice ?? 0,
            }))
          )
        }
      })
      .catch((error: any) => {
        console.error("Error al cargar el documento:", error)
        toast({ title: "No se pudo cargar el documento", description: error.message, variant: "destructive" })
      })
      .finally(() => setLoadingDoc(false))
  }, [editId])

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof DocumentItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + item.quantity * item.unitPrice
    }, 0)
  }

  const handleGeneratePDF = () => {
    console.log("[PDF] Click en Descargar PDF")
    const filteredItems = items.filter((item) => item.description.trim() !== "")

    if (filteredItems.length === 0) {
      toast({ title: "Agrega al menos un ítem con descripción", variant: "destructive" })
      return
    }

    const documentData = {
      companyName,
      companyNit,
      companyAddress,
      companyPhone,
      companyEmail,
      clientName,
      clientNit,
      clientPhone,
      clientAddress,
      clientEmail,
      documentTitle: documentTitle || "COTIZACION",
      generalDescription,
      deliveryDays: Number.parseInt(deliveryDays) || 0,
      warrantyMonths: Number.parseInt(warrantyMonths) || 0,
      notes,
      date: formatDate(documentDate),
      documentNumber: documentNumber || `DOC-${Date.now()}`,
      items: filteredItems,
      total: calculateTotal(),
    }

    try {
      console.log("[PDF] Datos enviados:", documentData)
      generateFreeDocumentPDF(documentData)
    } catch (error) {
      console.error("[PDF] Error generando PDF:", error)
      toast({ title: "No se pudo generar el PDF", description: "Verifica los datos del documento.", variant: "destructive" })
    }
  }

  const handleSaveToPortfolio = async () => {
    const filteredItems = items.filter((item) => item.description.trim() !== "")

    if (filteredItems.length === 0) {
      toast({ title: "Agrega al menos un ítem con descripción", variant: "destructive" })
      return
    }

    if (!clientName.trim()) {
      toast({ title: "Ingresa el nombre del cliente", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload = {
        document_title: documentTitle || "COTIZACION",
        document_number: documentNumber || null,
        company_name: companyName,
        company_nit: companyNit || null,
        company_address: companyAddress || null,
        company_phone: companyPhone || null,
        company_email: companyEmail || null,
        client_name: clientName,
        client_nit: clientNit || null,
        client_address: clientAddress || null,
        client_phone: clientPhone || null,
        client_email: clientEmail || null,
        general_description: generalDescription || null,
        items: filteredItems,
        total: calculateTotal(),
        delivery_days: Number.parseInt(deliveryDays) || 0,
        warranty_months: Number.parseInt(warrantyMonths) || 0,
        notes: notes || null,
        document_date: documentDate || null,
      }

      const response = await fetch(
        isEditing && editId ? `/api/free-documents/${editId}` : "/api/free-documents",
        {
          method: isEditing && editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al guardar")
      }

      toast({
        title: isEditing ? "Documento actualizado" : "Documento guardado en el portafolio",
      })
      router.push("/portafolio")
    } catch (error: any) {
      console.error("Error al guardar:", error)
      toast({
        title: "No se pudo guardar el documento",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push(isEditing ? "/portafolio" : "/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {isEditing ? "Volver al portafolio" : "Regresar"}
        </Button>
      </div>

      {loadingDoc && (
        <p className="text-sm text-muted-foreground">Cargando documento...</p>
      )}
      {isEditing && !loadingDoc && (
        <p className="text-sm text-muted-foreground">
          Editando documento existente. Los cambios se guardaran sobre el mismo documento.
        </p>
      )}

      {/* Titulo del documento */}
      <Card>
        <CardHeader>
          <CardTitle>Titulo del Documento</CardTitle>
          <CardDescription>
            Define el titulo y la fecha del documento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentTitle">Titulo</Label>
              <Input
                id="documentTitle"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Ej: COTIZACION, PROPUESTA, PRESUPUESTO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentDate">Fecha del Documento</Label>
              <Input
                id="documentDate"
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="generalDescription">Descripcion General (opcional)</Label>
            <Textarea
              id="generalDescription"
              value={generalDescription}
              onChange={(e) => setGeneralDescription(e.target.value)}
              placeholder="Describe brevemente el objeto del documento..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Datos de la empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion de tu Empresa</CardTitle>
          <CardDescription>Datos de tu empresa para el documento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="freeCompanyName">Nombre de tu Empresa</Label>
              <Input
                id="freeCompanyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Tu Empresa SAS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freeCompanyNit">NIT de tu Empresa</Label>
              <Input
                id="freeCompanyNit"
                value={companyNit}
                onChange={(e) => setCompanyNit(e.target.value)}
                placeholder="900123456-7"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freeCompanyAddress">Direccion</Label>
              <Input
                id="freeCompanyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Calle 123 # 45-67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freeCompanyPhone">Telefono</Label>
              <Input
                id="freeCompanyPhone"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="3001234567"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="freeCompanyEmail">Email</Label>
              <Input
                id="freeCompanyEmail"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="contacto@tuempresa.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos del cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion del Cliente</CardTitle>
          <CardDescription>Datos del cliente destinatario</CardDescription>
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
              <Label htmlFor="freeClientName">Nombre del Cliente</Label>
              <Input
                id="freeClientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Juan Perez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freeClientNit">NIT / CC del Cliente</Label>
              <Input
                id="freeClientNit"
                value={clientNit}
                onChange={(e) => setClientNit(e.target.value)}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freeClientPhone">Telefono</Label>
              <Input
                id="freeClientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="3001234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freeClientAddress">Direccion</Label>
              <Input
                id="freeClientAddress"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Calle 123 # 45-67"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="freeClientEmail">Email del Cliente</Label>
              <Input
                id="freeClientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Condiciones */}
      <Card>
        <CardHeader>
          <CardTitle>Condiciones</CardTitle>
          <CardDescription>Plazo de entrega, garantia y notas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="freeDeliveryDays">Plazo de Entrega (dias)</Label>
              <Input
                id="freeDeliveryDays"
                type="number"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freeWarrantyMonths">Garantia (meses)</Label>
              <Input
                id="freeWarrantyMonths"
                type="number"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                placeholder="12"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="freeNotes">Notas Adicionales</Label>
            <Textarea
              id="freeNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condiciones especiales, forma de pago, materiales, etc."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items / Productos libres */}
      <Card>
        <CardHeader>
          <CardTitle>Items del Documento</CardTitle>
          <CardDescription>
            Escribe libremente la descripcion, cantidad y precio de cada item
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Item {index + 1}</h3>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Textarea
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.id, "description", e.target.value)
                  }
                  placeholder="Describe el producto o servicio: tipo, medidas, color, sistema, vidrio, etc."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "quantity",
                        Number.parseInt(e.target.value) || 1
                      )
                    }
                    placeholder="1"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio Unitario ($)</Label>
                  <Input
                    type="number"
                    value={item.unitPrice || ""}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "unitPrice",
                        Number.parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {item.description && item.unitPrice > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Subtotal:</span>
                    <span className="text-accent">
                      ${(item.quantity * item.unitPrice).toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addItem}
            className="w-full bg-transparent"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Item
          </Button>
        </CardContent>
      </Card>

      {/* Total y acciones */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total del Documento</p>
              <p className="text-3xl font-bold text-accent">
                ${calculateTotal().toLocaleString("es-CO")}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSaveToPortfolio}
                size="lg"
                variant="outline"
                disabled={saving || !clientName.trim() || items.every((i) => !i.description.trim())}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Guardar en Portafolio"}
              </Button>
              <Button
                type="button"
                onClick={handleGeneratePDF}
                size="lg"
                disabled={!clientName.trim() || items.every((i) => !i.description.trim())}
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
