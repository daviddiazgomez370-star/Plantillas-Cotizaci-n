"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Receipt, ArrowLeft, Trash2, ArrowRight, Calendar, Loader2, AlertCircle, PenLine } from "lucide-react"
import Link from "next/link"
import type { Quotation, Invoice, FreeDocument } from "@/lib/database"
import { generateInvoicePDF } from "@/lib/pdf-generator"

export function PortfolioView() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [freeDocuments, setFreeDocuments] = useState<FreeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [selectedFreeDoc, setSelectedFreeDoc] = useState<FreeDocument | null>(null)
  const [workDescription, setWorkDescription] = useState("")
  const [workStartDate, setWorkStartDate] = useState("")
  const [workEndDate, setWorkEndDate] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setDbError(null)
    try {
      const [quotationsRes, invoicesRes, freeDocsRes] = await Promise.all([
        fetch("/api/quotations"),
        fetch("/api/invoices"),
        fetch("/api/free-documents"),
      ])

      if (!quotationsRes.ok || !invoicesRes.ok || !freeDocsRes.ok) {
        throw new Error("No se pudo conectar a la base de datos. Verifica que XAMPP este encendido y la base de datos creada.")
      }

      const quotationsData = await quotationsRes.json()
      const invoicesData = await invoicesRes.json()
      const freeDocsData = await freeDocsRes.json()

      setQuotations(quotationsData)
      setInvoices(invoicesData)
      setFreeDocuments(freeDocsData)
    } catch (error: any) {
      console.error("Error al cargar datos:", error)
      setDbError(error.message || "Error al conectar con la base de datos. Verifica que XAMPP este activo.")
      setQuotations([])
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleConvertToInvoice = (quotation: Quotation) => {
    setSelectedQuotation(quotation)
    setSelectedFreeDoc(null)
    setWorkDescription(quotation.products?.map((p: any) => p.description).filter(Boolean).join("; ") || "")
    setWorkStartDate(quotation.work_start_date || "")
    setWorkEndDate(quotation.work_end_date || "")
    setPaymentDate("")
    setPaymentMethod("")
    setConvertDialogOpen(true)
  }

  const handleConvertFreeDocToInvoice = (doc: FreeDocument) => {
    setSelectedFreeDoc(doc)
    setSelectedQuotation(null)
    setWorkDescription(doc.general_description || "")
    setWorkStartDate("")
    setWorkEndDate("")
    setPaymentDate("")
    setPaymentMethod("")
    setConvertDialogOpen(true)
  }

  const confirmConvertToInvoice = async () => {
    if (!selectedQuotation && !selectedFreeDoc) return

    // Origen: cotizacion o documento libre
    const source = selectedQuotation
      ? {
          company_name: selectedQuotation.company_name,
          company_nit: selectedQuotation.company_nit,
          company_address: selectedQuotation.company_address,
          company_phone: selectedQuotation.company_phone,
          company_email: selectedQuotation.company_email,
          client_name: selectedQuotation.client_name,
          client_nit: selectedQuotation.client_nit,
          client_address: selectedQuotation.client_address,
          client_phone: selectedQuotation.client_phone,
          client_email: selectedQuotation.client_email,
          products: selectedQuotation.products,
          items: null as any,
          subtotal: selectedQuotation.subtotal,
          iva: selectedQuotation.iva,
          total: selectedQuotation.total,
        }
      : {
          company_name: selectedFreeDoc!.company_name,
          company_nit: selectedFreeDoc!.company_nit,
          company_address: selectedFreeDoc!.company_address,
          company_phone: selectedFreeDoc!.company_phone,
          company_email: selectedFreeDoc!.company_email,
          client_name: selectedFreeDoc!.client_name,
          client_nit: selectedFreeDoc!.client_nit,
          client_address: selectedFreeDoc!.client_address,
          client_phone: selectedFreeDoc!.client_phone,
          client_email: selectedFreeDoc!.client_email,
          products: null as any,
          items: selectedFreeDoc!.items,
          subtotal: selectedFreeDoc!.total,
          iva: 0,
          total: selectedFreeDoc!.total,
        }

    try {
      const invoiceData = {
        quotation_id: selectedQuotation?.id || null,
        ...source,
        work_description: workDescription,
        work_start_date: workStartDate,
        work_end_date: workEndDate,
        payment_date: paymentDate,
        payment_method: paymentMethod,
      }

      // Guardar la cuenta de cobro
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      })

      if (!response.ok) throw new Error("Error al crear cuenta de cobro")

      // Actualizar estado de la cotizacion si viene de una
      if (selectedQuotation) {
        await fetch(`/api/quotations/${selectedQuotation.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "converted" }),
        })
      }

      // Generar PDF
      generateInvoicePDF({
        ...invoiceData,
        date: new Date().toISOString().split("T")[0],
        invoiceNumber: `INV-${Date.now()}`,
      })

      setConvertDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error("Error:", error)
      alert("Error al convertir a cuenta de cobro")
    }
  }

  const handleDelete = async (id: string, type: "quotation" | "invoice" | "free-document") => {
    const labels = {
      "quotation": "cotizacion",
      "invoice": "cuenta de cobro",
      "free-document": "documento libre",
    }
    if (!confirm(`Estas seguro de eliminar esta ${labels[type]}?`)) {
      return
    }

    try {
      const endpoints = {
        "quotation": `/api/quotations/${id}`,
        "invoice": `/api/invoices/${id}`,
        "free-document": `/api/free-documents/${id}`,
      }
      const response = await fetch(endpoints[type], { method: "DELETE" })

      if (!response.ok) throw new Error("Error al eliminar")

      fetchData()
    } catch (error) {
      console.error("Error:", error)
      alert("Error al eliminar")
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Aprobada", className: "bg-green-100 text-green-800" },
      converted: { label: "Convertida", className: "bg-blue-100 text-blue-800" },
      cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800" },
    }

    const variant = variants[status] || variants.pending
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Cargando portafolio...</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Portafolio</h1>
          <p className="text-slate-600">Gestiona tus cotizaciones y cuentas de cobro</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>
      </div>

      {dbError && (
        <Card className="mb-6 border-destructive">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-destructive">Error de conexion</p>
              <p className="text-sm text-muted-foreground mt-1">{dbError}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Asegurate de que XAMPP este encendido (Apache + MySQL) y que hayas creado la base de datos siguiendo las instrucciones.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchData}>
                Reintentar conexion
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="quotations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="quotations">
            <FileText className="mr-2 h-4 w-4" />
            Cotizaciones ({quotations.length})
          </TabsTrigger>
          <TabsTrigger value="free-documents">
            <PenLine className="mr-2 h-4 w-4" />
            Docs. Libres ({freeDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="mr-2 h-4 w-4" />
            Cuentas de Cobro ({invoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotations">
          <Card>
            <CardHeader>
              <CardTitle>Cotizaciones</CardTitle>
              <CardDescription>Todas las cotizaciones generadas ordenadas por fecha</CardDescription>
            </CardHeader>
            <CardContent>
              {quotations.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600">No hay cotizaciones aún</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fechas de Trabajo</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotations.map((quotation) => (
                        <TableRow key={quotation.id}>
                          <TableCell>{new Date(quotation.created_at).toLocaleDateString("es-CO")}</TableCell>
                          <TableCell className="font-medium">{quotation.client_name}</TableCell>
                          <TableCell>${quotation.total.toLocaleString("es-CO")}</TableCell>
                          <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                          <TableCell>
                            {quotation.work_start_date && quotation.work_end_date ? (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Calendar className="h-3 w-3" />
                                {new Date(quotation.work_start_date).toLocaleDateString("es-CO")} -{" "}
                                {new Date(quotation.work_end_date).toLocaleDateString("es-CO")}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">No especificado</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {quotation.status !== "converted" && (
                                <Button size="sm" onClick={() => handleConvertToInvoice(quotation)}>
                                  <ArrowRight className="mr-1 h-3 w-3" />A Cuenta de Cobro
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(quotation.id, "quotation")}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="free-documents">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Libres</CardTitle>
              <CardDescription>Todos los documentos libres guardados ordenados por fecha</CardDescription>
            </CardHeader>
            <CardContent>
              {freeDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <PenLine className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600">No hay documentos libres aun</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Titulo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {freeDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            {doc.document_date
                              ? new Date(doc.document_date + "T12:00:00").toLocaleDateString("es-CO")
                              : new Date(doc.created_at).toLocaleDateString("es-CO")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{doc.document_title}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{doc.client_name}</TableCell>
                          <TableCell>${doc.total.toLocaleString("es-CO")}</TableCell>
                          <TableCell>{doc.items?.length || 0} items</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/documento-libre?id=${doc.id}`}>
                                  <PenLine className="mr-1 h-3 w-3" />
                                  Editar
                                </Link>
                              </Button>
                              <Button size="sm" onClick={() => handleConvertFreeDocToInvoice(doc)}>
                                <ArrowRight className="mr-1 h-3 w-3" />A Cuenta de Cobro
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(doc.id, "free-document")}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Cuentas de Cobro</CardTitle>
              <CardDescription>Todas las cuentas de cobro generadas ordenadas por fecha</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600">No hay cuentas de cobro aún</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Trabajo Realizado</TableHead>
                        <TableHead>Fecha de Pago</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{new Date(invoice.created_at).toLocaleDateString("es-CO")}</TableCell>
                          <TableCell className="font-medium">{invoice.client_name}</TableCell>
                          <TableCell>${invoice.total.toLocaleString("es-CO")}</TableCell>
                          <TableCell>
                            {invoice.work_start_date && invoice.work_end_date ? (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Calendar className="h-3 w-3" />
                                {new Date(invoice.work_start_date).toLocaleDateString("es-CO")} -{" "}
                                {new Date(invoice.work_end_date).toLocaleDateString("es-CO")}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">No especificado</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {invoice.payment_date ? (
                              new Date(invoice.payment_date).toLocaleDateString("es-CO")
                            ) : (
                              <span className="text-slate-400">Pendiente</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/cuenta-cobro?id=${invoice.id}`}>
                                  <PenLine className="mr-1 h-3 w-3" />
                                  Editar
                                </Link>
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(invoice.id, "invoice")}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Convertir a Cuenta de Cobro</DialogTitle>
            <DialogDescription>
              Completa la información del trabajo realizado para generar la cuenta de cobro
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="work_description">Descripción del Trabajo</Label>
              <Textarea
                id="work_description"
                placeholder="Describe el trabajo realizado..."
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work_start_date">Fecha de Inicio</Label>
                <Input
                  id="work_start_date"
                  type="date"
                  value={workStartDate}
                  onChange={(e) => setWorkStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work_end_date">Fecha de Finalización</Label>
                <Input
                  id="work_end_date"
                  type="date"
                  value={workEndDate}
                  onChange={(e) => setWorkEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">Fecha de Pago</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago</Label>
                <Input
                  id="payment_method"
                  placeholder="Ej: Transferencia bancaria"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmConvertToInvoice}>Generar Cuenta de Cobro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
