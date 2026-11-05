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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FileText, Receipt, ArrowLeft, Trash2, ArrowRight, Calendar, Loader2, AlertCircle, PenLine } from "lucide-react"
import Link from "next/link"
import type { Quotation, Invoice, FreeDocument } from "@/lib/database"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { formatDate, getCurrentDateInputValue } from "@/lib/dates"
import { toast } from "@/hooks/use-toast"

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escapeValue = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`
  const csv = [headers, ...rows].map((row) => row.map(escapeValue).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

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
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    type: "quotation" | "invoice" | "free-document"
  } | null>(null)

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
      setFreeDocuments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const matchesSearch = (...values: Array<string | number | null | undefined>) => {
    const term = searchTerm.trim().toLocaleLowerCase("es-CO")
    return !term || values.some((value) => String(value ?? "").toLocaleLowerCase("es-CO").includes(term))
  }

  const filteredQuotations = quotations.filter((quotation) =>
    matchesSearch(quotation.client_name, quotation.company_name, quotation.status)
  )
  const filteredFreeDocuments = freeDocuments.filter((doc) =>
    matchesSearch(doc.client_name, doc.company_name, doc.document_title, doc.document_number, doc.status)
  )
  const filteredInvoices = invoices.filter((invoice) =>
    matchesSearch(invoice.client_name, invoice.company_name, invoice.payment_method)
  )

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
    if (doc.status === "converted") {
      toast({ title: "Este documento ya fue convertido en una cuenta de cobro", variant: "destructive" })
      return
    }

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
          products: selectedFreeDoc!.items,
          subtotal: selectedFreeDoc!.total,
          iva: 0,
          total: selectedFreeDoc!.total,
        }

    try {
      const invoiceData = {
        quotation_id: selectedQuotation?.id || null,
        free_document_id: selectedFreeDoc?.id || null,
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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "No se pudo crear la cuenta de cobro")
      }

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
        date: getCurrentDateInputValue(),
        invoiceNumber: `INV-${Date.now()}`,
      })

      setConvertDialogOpen(false)
      toast({ title: "Cuenta de cobro creada" })
      fetchData()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "No se pudo convertir el documento",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string, type: "quotation" | "invoice" | "free-document") => {
    try {
      const endpoints = {
        "quotation": `/api/quotations/${id}`,
        "invoice": `/api/invoices/${id}`,
        "free-document": `/api/free-documents/${id}`,
      }
      const response = await fetch(endpoints[type], { method: "DELETE" })

      if (!response.ok) throw new Error("Error al eliminar")

      toast({ title: "Registro eliminado" })
      fetchData()
    } catch (error) {
      console.error("Error:", error)
      toast({ title: "No se pudo eliminar el registro", variant: "destructive" })
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
      <div className="flex flex-col justify-between gap-4 mb-8 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Portafolio</h1>
          <p className="text-slate-600">Gestiona tus cotizaciones y cuentas de cobro</p>
        </div>
        <div className="flex w-full gap-3 sm:w-auto">
          <Input
            aria-label="Buscar en el portafolio"
            className="sm:w-72"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por cliente, empresa o estado..."
          />
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
        </div>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Cotizaciones</CardTitle>
                  <CardDescription>Todas las cotizaciones generadas ordenadas por fecha</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadCsv("cotizaciones.csv", ["Fecha de creación", "Cliente", "Empresa", "Total", "Estado"], filteredQuotations.map((quotation) => [formatDate(quotation.created_at), quotation.client_name, quotation.company_name, quotation.total, quotation.status]))}
                >
                  Exportar CSV
                </Button>
              </div>
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
                      {filteredQuotations.map((quotation) => (
                        <TableRow key={quotation.id}>
                          <TableCell>{formatDate(quotation.created_at)}</TableCell>
                          <TableCell className="font-medium">{quotation.client_name}</TableCell>
                          <TableCell>${quotation.total.toLocaleString("es-CO")}</TableCell>
                          <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                          <TableCell>
                            {quotation.work_start_date && quotation.work_end_date ? (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Calendar className="h-3 w-3" />
                                {formatDate(quotation.work_start_date)} - {formatDate(quotation.work_end_date)}
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
                                onClick={() => setDeleteTarget({ id: quotation.id, type: "quotation" })}
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Documentos Libres</CardTitle>
                  <CardDescription>Todos los documentos libres guardados ordenados por fecha</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadCsv("documentos-libres.csv", ["Fecha de creación", "Título", "Cliente", "Empresa", "Total", "Estado"], filteredFreeDocuments.map((doc) => [formatDate(doc.created_at), doc.document_title, doc.client_name, doc.company_name, doc.total, doc.status]))}
                >
                  Exportar CSV
                </Button>
              </div>
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
                        <TableHead>Fecha de creación</TableHead>
                        <TableHead>Titulo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFreeDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>{formatDate(doc.created_at)}</TableCell>
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
                              {doc.status === "converted" ? (
                                <Badge className="bg-blue-100 text-blue-800">Convertido</Badge>
                              ) : (
                                <Button size="sm" onClick={() => handleConvertFreeDocToInvoice(doc)}>
                                  <ArrowRight className="mr-1 h-3 w-3" />A Cuenta de Cobro
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteTarget({ id: doc.id, type: "free-document" })}
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Cuentas de Cobro</CardTitle>
                  <CardDescription>Todas las cuentas de cobro generadas ordenadas por fecha</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadCsv("cuentas-de-cobro.csv", ["Fecha de creación", "Cliente", "Empresa", "Total", "Método de pago"], filteredInvoices.map((invoice) => [formatDate(invoice.created_at), invoice.client_name, invoice.company_name, invoice.total, invoice.payment_method]))}
                >
                  Exportar CSV
                </Button>
              </div>
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
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{formatDate(invoice.created_at)}</TableCell>
                          <TableCell className="font-medium">{invoice.client_name}</TableCell>
                          <TableCell>${invoice.total.toLocaleString("es-CO")}</TableCell>
                          <TableCell>
                            {invoice.work_start_date && invoice.work_end_date ? (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Calendar className="h-3 w-3" />
                                {formatDate(invoice.work_start_date)} - {formatDate(invoice.work_end_date)}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">No especificado</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {invoice.payment_date ? (
                              formatDate(invoice.payment_date)
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
                              <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ id: invoice.id, type: "invoice" })}>
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

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  handleDelete(deleteTarget.id, deleteTarget.type)
                }
                setDeleteTarget(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
