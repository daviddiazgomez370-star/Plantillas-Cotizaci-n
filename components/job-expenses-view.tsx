"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { ExpenseCategory, Job, JobExpense } from "@/lib/database"
import { toast } from "@/hooks/use-toast"

type ExpensesResponse = { job: Job; expenses: JobExpense[]; summary: { expense_count: number; total_expenses: number; by_category: Array<{ category: ExpenseCategory; total: number }> } }
type ExpenseForm = { expense_date: string; category: ExpenseCategory; description: string; amount: string; note: string }
const categories: Record<ExpenseCategory, string> = { materials: "Materiales", transport: "Transporte", tools: "Herramientas", food: "Alimentación", services: "Servicios", other: "Otros" }
const emptyForm: ExpenseForm = { expense_date: new Date().toISOString().slice(0, 10), category: "materials", description: "", amount: "", note: "" }
const money = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
const date = (value: string) => new Intl.DateTimeFormat("es-CO").format(new Date(`${value}T12:00:00`))

async function errorMessage(response: Response, fallback: string) { try { return (await response.json()).error || fallback } catch { return fallback } }

export function JobExpensesView({ jobs }: { jobs: Job[] }) {
  const [jobId, setJobId] = useState("")
  const [job, setJob] = useState<Job | null>(null)
  const [expenses, setExpenses] = useState<JobExpense[]>([])
  const [summary, setSummary] = useState<ExpensesResponse["summary"]>({ expense_count: 0, total_expenses: 0, by_category: [] })
  const [month, setMonth] = useState("")
  const [category, setCategory] = useState<ExpenseCategory | "">("")
  const [form, setForm] = useState<ExpenseForm>(emptyForm)
  const [editing, setEditing] = useState<JobExpense | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!jobId) { setJob(null); setExpenses([]); setSummary({ expense_count: 0, total_expenses: 0, by_category: [] }); return }
    setLoading(true); setError(null)
    try {
      const search = new URLSearchParams()
      if (month) search.set("month", month)
      if (category) search.set("category", category)
      const response = await fetch(`/api/jobs/${jobId}/expenses?${search}`)
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudieron cargar los gastos"))
      const data = await response.json() as ExpensesResponse
      setJob(data.job); setExpenses(data.expenses); setSummary(data.summary)
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : "No se pudieron cargar los gastos") } finally { setLoading(false) }
  }, [jobId, month, category])
  useEffect(() => { void load() }, [load])

  const locked = job?.status === "completed"
  const resetForm = () => { setEditing(null); setForm({ ...emptyForm }) }
  const save = async () => {
    if (!job) return
    setSaving(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}/expenses${editing ? `/${editing.id}` : ""}`, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo guardar el gasto"))
      toast({ title: editing ? "Gasto actualizado" : "Gasto registrado" }); resetForm(); await load()
    } catch (caught: unknown) { toast({ title: "No se pudo guardar el gasto", description: caught instanceof Error ? caught.message : "Intenta nuevamente.", variant: "destructive" }) } finally { setSaving(false) }
  }
  const edit = (expense: JobExpense) => { setEditing(expense); setForm({ expense_date: expense.expense_date, category: expense.category, description: expense.description, amount: String(expense.amount), note: expense.note || "" }) }
  const remove = async (expense: JobExpense) => {
    if (!job || !window.confirm(`¿Eliminar este gasto de ${money(expense.amount)}?`)) return
    try { const response = await fetch(`/api/jobs/${job.id}/expenses/${expense.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(await errorMessage(response, "No se pudo eliminar el gasto")); toast({ title: "Gasto eliminado" }); await load() } catch (caught: unknown) { toast({ title: "No se pudo eliminar el gasto", description: caught instanceof Error ? caught.message : "Intenta nuevamente.", variant: "destructive" }) }
  }

  return <div className="space-y-6"><Card><CardHeader><CardTitle>Gastos</CardTitle><CardDescription>Registra gastos reales por trabajo. No calcula nómina ni utilidad.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="max-w-xl space-y-2"><Label htmlFor="expense-job">Trabajo</Label><select id="expense-job" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={jobId} onChange={(event) => { setJobId(event.target.value); setMonth(""); setCategory(""); resetForm() }}><option value="">Selecciona un trabajo</option>{jobs.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></div>{job && <div className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-muted-foreground">Trabajo</p><p className="font-medium">{job.name}</p></div><div><p className="text-muted-foreground">Estado</p><Badge variant={locked ? "secondary" : job.status === "in_progress" ? "default" : "outline"}>{locked ? "Finalizado" : job.status === "in_progress" ? "En proceso" : "Aceptado"}</Badge></div><div><p className="text-muted-foreground">Valor acordado</p><p>{money(job.agreed_value)}</p></div><div><p className="text-muted-foreground">Total gastos</p><p>{money(summary.total_expenses)} · {summary.expense_count}</p></div></div>}{locked && <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">El trabajo está <strong>Finalizado</strong>. Sus gastos son solo de consulta.</p>}</CardContent></Card>
  {jobId && <>{error && <Card className="border-destructive"><CardContent className="flex gap-3 py-4 text-sm"><AlertCircle className="h-5 w-5 text-destructive" />{error}</CardContent></Card>}{job && <><Card><CardHeader><CardTitle>{editing ? "Editar gasto" : "Registrar gasto"}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><div className="space-y-2"><Label>Fecha</Label><Input type="date" value={form.expense_date} disabled={locked} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div><div className="space-y-2"><Label>Categoría</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.category} disabled={locked} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="space-y-2"><Label>Valor (COP)</Label><Input type="number" min="0.01" step="0.01" value={form.amount} disabled={locked} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div></div><div className="space-y-2"><Label>Descripción</Label><Input value={form.description} disabled={locked} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div className="space-y-2"><Label>Nota opcional</Label><Textarea value={form.note} disabled={locked} maxLength={1000} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>{!locked && <div className="flex gap-2"><Button disabled={saving} onClick={() => void save()}><Plus className="mr-2 h-4 w-4" />{editing ? "Guardar cambios" : "Registrar gasto"}</Button>{editing && <Button variant="outline" onClick={resetForm}>Cancelar</Button>}</div>}</CardContent></Card><Card><CardHeader><CardTitle>Resumen</CardTitle><CardDescription>Valores para los filtros actuales; no representan utilidad.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{summary.by_category.length ? summary.by_category.map((item) => <div key={item.category} className="rounded-lg border border-border p-3"><p className="text-sm text-muted-foreground">{categories[item.category]}</p><p className="font-semibold">{money(item.total)}</p></div>) : <p className="text-sm text-muted-foreground">Aún no hay gastos para estos filtros.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Gastos registrados</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><div className="space-y-2"><Label>Mes</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div><div className="space-y-2"><Label>Categoría</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory | "")}><option value="">Todas las categorías</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></div>{loading ? <p className="py-6 text-center text-sm text-muted-foreground">Cargando gastos...</p> : expenses.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No hay gastos para estos filtros.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Categoría</TableHead><TableHead>Descripción</TableHead><TableHead>Valor</TableHead><TableHead>Nota</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{expenses.map((expense) => <TableRow key={expense.id}><TableCell>{date(expense.expense_date)}</TableCell><TableCell><Badge variant="outline">{categories[expense.category]}</Badge></TableCell><TableCell className="font-medium">{expense.description}</TableCell><TableCell>{money(expense.amount)}</TableCell><TableCell>{expense.note || "—"}</TableCell><TableCell className="text-right">{!locked && <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => edit(expense)}><Pencil className="mr-1 h-3 w-3" />Editar</Button><Button size="sm" variant="outline" onClick={() => void remove(expense)}><Trash2 className="mr-1 h-3 w-3" />Eliminar</Button></div>}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card></>}</>}</div>
}
