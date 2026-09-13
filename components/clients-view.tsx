"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, Plus, Save, Trash2, AlertCircle, Users } from "lucide-react"
import type { Client } from "@/lib/database"

const emptyForm = {
  name: "",
  nit: "",
  address: "",
  phone: "",
  email: "",
  notes: "",
}

export function ClientsView() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setDbError(null)
    try {
      const res = await fetch("/api/clients")
      if (!res.ok) {
        throw new Error("No se pudo conectar a la base de datos. Verifica que XAMPP este encendido.")
      }
      setClients(await res.json())
    } catch (error: any) {
      console.error("Error al cargar clientes:", error)
      setDbError(error.message || "Error al conectar con la base de datos.")
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const updateForm = (field: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("El nombre del cliente es obligatorio.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(editingId ? `/api/clients/${editingId}` : "/api/clients", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Error al guardar el cliente")
      }

      alert(editingId ? "Cliente actualizado exitosamente." : "Cliente registrado exitosamente.")
      resetForm()
      fetchClients()
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (client: Client) => {
    setEditingId(client.id)
    setForm({
      name: client.name || "",
      nit: client.nit || "",
      address: client.address || "",
      phone: client.phone || "",
      email: client.email || "",
      notes: client.notes || "",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Estas seguro de eliminar este cliente?")) return
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      fetchClients()
    } catch (error) {
      console.error("Error:", error)
      alert("Error al eliminar el cliente")
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild className="gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Regresar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Cliente" : "Registrar Cliente"}</CardTitle>
          <CardDescription>
            {editingId
              ? "Modifica los datos del cliente y guarda los cambios."
              : "Inscribe un cliente para reutilizar sus datos en cotizaciones y cuentas de cobro."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nombre del Cliente *</Label>
              <Input
                id="client-name"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-nit">NIT / CC</Label>
              <Input
                id="client-nit"
                value={form.nit}
                onChange={(e) => updateForm("nit", e.target.value)}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Teléfono</Label>
              <Input
                id="client-phone"
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
                placeholder="3001234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-address">Dirección</Label>
            <Input
              id="client-address"
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
              placeholder="Calle 123 # 45-67"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-notes">Notas (opcional)</Label>
            <Textarea
              id="client-notes"
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              placeholder="Información adicional del cliente..."
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Registrar Cliente"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {dbError && (
        <Card className="border-destructive">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-destructive">Error de conexion</p>
              <p className="text-sm text-muted-foreground mt-1">{dbError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchClients}>
                Reintentar conexion
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Clientes Registrados ({clients.length})</CardTitle>
          <CardDescription>Todos los clientes guardados en la base de datos</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Cargando clientes...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-600">No hay clientes registrados aun</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>NIT / CC</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.nit || <span className="text-slate-400">—</span>}</TableCell>
                      <TableCell>{client.phone || <span className="text-slate-400">—</span>}</TableCell>
                      <TableCell>{client.email || <span className="text-slate-400">—</span>}</TableCell>
                      <TableCell>{client.address || <span className="text-slate-400">—</span>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(client)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(client.id)}>
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
    </div>
  )
}
