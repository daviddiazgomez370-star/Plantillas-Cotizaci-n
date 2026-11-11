"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, BriefcaseBusiness, Loader2, Pencil, Save, UserRoundCheck, Users, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkAttendanceView } from "@/components/work-attendance-view"
import { JobExpensesView } from "@/components/job-expenses-view"
import { JobClientPaymentsView } from "@/components/job-client-payments-view"
import type { Client, Job, JobStatus, Worker } from "@/lib/database"
import { toast } from "@/hooks/use-toast"

type WorkerForm = {
  name: string
  job_title: string
  phone: string
  compensation_type: "daily_rate" | "profit_share"
  daily_rate: string
}

type JobForm = {
  name: string
  description: string
  client_id: string
  agreed_value: string
  start_date: string
  end_date: string
  notes: string
}

const emptyWorkerForm: WorkerForm = { name: "", job_title: "", phone: "", compensation_type: "daily_rate", daily_rate: "" }
const emptyJobForm: JobForm = { name: "", description: "", client_id: "", agreed_value: "", start_date: "", end_date: "", notes: "" }
const statusLabels: Record<JobStatus, string> = { accepted: "Aceptado", in_progress: "En proceso", completed: "Finalizado" }

function statusVariant(status: JobStatus) {
  return status === "completed" ? "secondary" : status === "in_progress" ? "default" : "outline"
}

function formatMoney(value: number | string | undefined) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value || 0))
}

function formatDate(value: string | undefined) {
  if (!value) return "—"
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("es-CO").format(date)
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json()
    return body.error || fallback
  } catch {
    return fallback
  }
}

export function WorkersJobsView() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [workerForm, setWorkerForm] = useState<WorkerForm>(emptyWorkerForm)
  const [jobForm, setJobForm] = useState<JobForm>(emptyJobForm)
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [initialWorkerIds, setInitialWorkerIds] = useState<string[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [assignmentIds, setAssignmentIds] = useState<string[]>([])
  const [savingWorker, setSavingWorker] = useState(false)
  const [savingJob, setSavingJob] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [workersResponse, jobsResponse, clientsResponse] = await Promise.all([
        fetch("/api/workers"),
        fetch("/api/jobs"),
        fetch("/api/clients"),
      ])
      if (!workersResponse.ok || !jobsResponse.ok || !clientsResponse.ok) {
        throw new Error("No se pudieron cargar los datos. Verifica que MariaDB/XAMPP este activo.")
      }
      setWorkers(await workersResponse.json())
      setJobs(await jobsResponse.json())
      setClients(await clientsResponse.json())
    } catch (error: any) {
      console.error("Error loading workers and jobs:", error)
      setLoadError(error.message || "No se pudo conectar con la base de datos.")
      setWorkers([])
      setJobs([])
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const activeWorkers = useMemo(() => workers.filter((worker) => worker.is_active), [workers])
  const assignedWorkerIds = useMemo(() => new Set(selectedJob?.workers?.map((worker) => worker.id) || []), [selectedJob])
  const availableWorkers = activeWorkers.filter((worker) => !assignedWorkerIds.has(worker.id))

  const toggleId = (id: string, ids: string[], update: (ids: string[]) => void) => {
    update(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])
  }

  const loadJob = async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}`)
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo consultar el trabajo"))
      const job = await response.json() as Job
      setSelectedJob(job)
      setAssignmentIds([])
      return job
    } catch (error: any) {
      toast({ title: "No se pudo consultar el trabajo", description: error.message, variant: "destructive" })
      return null
    }
  }

  const saveWorker = async () => {
    if (!workerForm.name.trim() || !workerForm.job_title.trim()) {
      toast({ title: "Completa el nombre y el cargo", variant: "destructive" })
      return
    }
    if (workerForm.compensation_type === "daily_rate" && !workerForm.daily_rate.trim()) {
      toast({ title: "Indica la tarifa diaria", variant: "destructive" })
      return
    }
    setSavingWorker(true)
    try {
      const response = await fetch(editingWorkerId ? `/api/workers/${editingWorkerId}` : "/api/workers", {
        method: editingWorkerId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...workerForm, phone: workerForm.phone || null, daily_rate: workerForm.compensation_type === "daily_rate" ? workerForm.daily_rate : null }),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo guardar el trabajador"))
      toast({ title: editingWorkerId ? "Trabajador actualizado" : "Trabajador registrado" })
      setWorkerForm(emptyWorkerForm)
      setEditingWorkerId(null)
      await fetchData()
    } catch (error: any) {
      toast({ title: "No se pudo guardar el trabajador", description: error.message, variant: "destructive" })
    } finally {
      setSavingWorker(false)
    }
  }

  const editWorker = (worker: Worker) => {
    setEditingWorkerId(worker.id)
    setWorkerForm({ name: worker.name, job_title: worker.job_title, phone: worker.phone || "", compensation_type: worker.compensation_type, daily_rate: worker.daily_rate?.toString() || "" })
  }

  const toggleWorker = async (worker: Worker) => {
    try {
      const response = await fetch(`/api/workers/${worker.id}/active`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !worker.is_active }) })
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo actualizar el trabajador"))
      toast({ title: worker.is_active ? "Trabajador desactivado" : "Trabajador activado" })
      await fetchData()
    } catch (error: any) {
      toast({ title: "No se pudo cambiar el estado", description: error.message, variant: "destructive" })
    }
  }

  const saveJob = async () => {
    if (!jobForm.name.trim() || !jobForm.agreed_value.trim()) {
      toast({ title: "Completa el nombre y el valor acordado", variant: "destructive" })
      return
    }
    setSavingJob(true)
    try {
      const response = await fetch(editingJobId ? `/api/jobs/${editingJobId}` : "/api/jobs", {
        method: editingJobId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...jobForm, client_id: jobForm.client_id || null, ...(editingJobId ? {} : { worker_ids: initialWorkerIds }) }),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo guardar el trabajo"))
      const job = await response.json() as Job
      toast({ title: editingJobId ? "Trabajo actualizado" : "Trabajo creado" })
      setJobForm(emptyJobForm)
      setInitialWorkerIds([])
      setEditingJobId(null)
      setSelectedJob(job)
      await fetchData()
    } catch (error: any) {
      toast({ title: "No se pudo guardar el trabajo", description: error.message, variant: "destructive" })
    } finally {
      setSavingJob(false)
    }
  }

  const editJob = async (job: Job) => {
    setEditingJobId(job.id)
    setJobForm({ name: job.name, description: job.description || "", client_id: job.client_id || "", agreed_value: job.agreed_value.toString(), start_date: job.start_date || "", end_date: job.end_date || "", notes: job.notes || "" })
    await loadJob(job.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const changeStatus = async () => {
    if (!selectedJob) return
    const nextStatus: JobStatus | null = selectedJob.status === "accepted" ? "in_progress" : selectedJob.status === "in_progress" ? "completed" : null
    if (!nextStatus) return
    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) })
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo actualizar el estado"))
      setSelectedJob(await response.json())
      toast({ title: `Estado actualizado a ${statusLabels[nextStatus]}` })
      await fetchData()
    } catch (error: any) {
      toast({ title: "No se pudo cambiar el estado", description: error.message, variant: "destructive" })
    }
  }

  const assignWorkers = async () => {
    if (!selectedJob || assignmentIds.length === 0) return
    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}/workers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ worker_ids: assignmentIds }) })
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudieron asignar los trabajadores"))
      setSelectedJob(await response.json())
      setAssignmentIds([])
      toast({ title: "Trabajadores asignados" })
      await fetchData()
    } catch (error: any) {
      toast({ title: "No se pudieron asignar", description: error.message, variant: "destructive" })
    }
  }

  const removeWorker = async (workerId: string) => {
    if (!selectedJob) return
    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}/workers/${workerId}`, { method: "DELETE" })
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo quitar el trabajador"))
      setSelectedJob(await response.json())
      toast({ title: "Trabajador quitado del trabajo" })
      await fetchData()
    } catch (error: any) {
      toast({ title: "No se pudo quitar", description: error.message, variant: "destructive" })
    }
  }

  return (
    <Tabs defaultValue="workers" className="space-y-6">
      <TabsList><TabsTrigger value="workers">Trabajadores</TabsTrigger><TabsTrigger value="jobs">Trabajos</TabsTrigger><TabsTrigger value="attendance">Días trabajados</TabsTrigger><TabsTrigger value="expenses">Gastos</TabsTrigger><TabsTrigger value="payments">Cobros</TabsTrigger></TabsList>
      {loadError && <Card className="border-destructive"><CardContent className="flex items-start gap-3 py-4"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><p className="font-semibold text-destructive">No fue posible cargar el modulo</p><p className="mt-1 text-sm text-muted-foreground">{loadError}</p><Button variant="outline" size="sm" className="mt-3" onClick={fetchData}>Reintentar</Button></div></CardContent></Card>}

      <TabsContent value="workers" className="space-y-6">
        <Card><CardHeader><CardTitle>{editingWorkerId ? "Editar trabajador" : "Registrar trabajador"}</CardTitle><CardDescription>La remuneracion pertenece a cada trabajador; no se usan valores fijos en la interfaz.</CardDescription></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="worker-name">Nombre *</Label><Input id="worker-name" value={workerForm.name} onChange={(event) => setWorkerForm({ ...workerForm, name: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="worker-title">Cargo *</Label><Input id="worker-title" value={workerForm.job_title} onChange={(event) => setWorkerForm({ ...workerForm, job_title: event.target.value })} placeholder="Ej. Ayudante, Instalador" /></div>
            <div className="space-y-2"><Label htmlFor="worker-phone">Telefono (opcional)</Label><Input id="worker-phone" value={workerForm.phone} onChange={(event) => setWorkerForm({ ...workerForm, phone: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="compensation-type">Tipo de remuneracion *</Label><select id="compensation-type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={workerForm.compensation_type} onChange={(event) => setWorkerForm({ ...workerForm, compensation_type: event.target.value as WorkerForm["compensation_type"], daily_rate: event.target.value === "daily_rate" ? workerForm.daily_rate : "" })}><option value="daily_rate">Tarifa diaria</option><option value="profit_share">Participante de reparto de utilidad</option></select></div>
            {workerForm.compensation_type === "daily_rate" && <div className="space-y-2"><Label htmlFor="daily-rate">Tarifa diaria (COP) *</Label><Input id="daily-rate" type="number" min="0" step="0.01" inputMode="decimal" value={workerForm.daily_rate} onChange={(event) => setWorkerForm({ ...workerForm, daily_rate: event.target.value })} placeholder="100000" /></div>}
          </div>
          <div className="flex gap-2"><Button onClick={saveWorker} disabled={savingWorker}><Save className="mr-2 h-4 w-4" />{savingWorker ? "Guardando..." : editingWorkerId ? "Guardar cambios" : "Registrar trabajador"}</Button>{editingWorkerId && <Button variant="outline" onClick={() => { setEditingWorkerId(null); setWorkerForm(emptyWorkerForm) }}>Cancelar</Button>}</div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Trabajadores registrados ({workers.length})</CardTitle><CardDescription>Los trabajadores inactivos se conservan para proteger futuros historiales.</CardDescription></CardHeader><CardContent>
          {loading ? <div className="flex justify-center gap-3 py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" />Cargando trabajadores...</div> : workers.length === 0 ? <div className="py-12 text-center text-muted-foreground"><Users className="mx-auto mb-3 h-10 w-10" />Aun no hay trabajadores registrados.</div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Cargo</TableHead><TableHead>Remuneracion</TableHead><TableHead>Tarifa</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{workers.map((worker) => <TableRow key={worker.id}><TableCell className="font-medium">{worker.name}<span className="mt-1 block text-xs text-muted-foreground">{worker.phone || "Sin telefono"}</span></TableCell><TableCell>{worker.job_title}</TableCell><TableCell>{worker.compensation_type === "daily_rate" ? "Tarifa diaria" : "Reparto de utilidad"}</TableCell><TableCell>{worker.compensation_type === "daily_rate" ? formatMoney(worker.daily_rate) : "No aplica"}</TableCell><TableCell><Badge variant={worker.is_active ? "default" : "secondary"}>{worker.is_active ? "Activo" : "Inactivo"}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => editWorker(worker)}><Pencil className="mr-1 h-3 w-3" />Editar</Button><Button variant="outline" size="sm" onClick={() => toggleWorker(worker)}>{worker.is_active ? "Desactivar" : "Activar"}</Button></div></TableCell></TableRow>)}</TableBody></Table></div>}
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="jobs" className="space-y-6">
        <Card><CardHeader><CardTitle>{editingJobId ? "Editar trabajo" : "Crear trabajo"}</CardTitle><CardDescription>Todo trabajo inicia como <strong>Aceptado</strong>. El estado operativo es independiente de pagos, gastos y nomina.</CardDescription></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="job-name">Nombre o titulo *</Label><Input id="job-name" value={jobForm.name} onChange={(event) => setJobForm({ ...jobForm, name: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="job-value">Valor acordado (COP) *</Label><Input id="job-value" type="number" min="0" step="0.01" inputMode="decimal" value={jobForm.agreed_value} onChange={(event) => setJobForm({ ...jobForm, agreed_value: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="job-client">Cliente (opcional)</Label><select id="job-client" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={jobForm.client_id} onChange={(event) => setJobForm({ ...jobForm, client_id: event.target.value })}><option value="">Sin cliente registrado</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="job-start">Fecha inicial o estimada</Label><Input id="job-start" type="date" value={jobForm.start_date} onChange={(event) => setJobForm({ ...jobForm, start_date: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="job-end">Fecha de finalizacion</Label><Input id="job-end" type="date" value={jobForm.end_date} onChange={(event) => setJobForm({ ...jobForm, end_date: event.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="job-description">Descripcion (opcional)</Label><Textarea id="job-description" rows={2} value={jobForm.description} onChange={(event) => setJobForm({ ...jobForm, description: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="job-notes">Observaciones (opcional)</Label><Textarea id="job-notes" rows={2} value={jobForm.notes} onChange={(event) => setJobForm({ ...jobForm, notes: event.target.value })} /></div>
          {!editingJobId && <div className="space-y-3 rounded-lg border border-border p-4"><div><p className="text-sm font-medium">Trabajadores iniciales (opcional)</p><p className="text-xs text-muted-foreground">Solo se muestran trabajadores activos. Podras ajustar la asignacion luego.</p></div>{activeWorkers.length === 0 ? <p className="text-sm text-muted-foreground">Primero registra y activa al menos un trabajador.</p> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{activeWorkers.map((worker) => <label key={worker.id} className="flex items-center gap-2 text-sm"><Checkbox checked={initialWorkerIds.includes(worker.id)} onCheckedChange={() => toggleId(worker.id, initialWorkerIds, setInitialWorkerIds)} />{worker.name} <span className="text-muted-foreground">({worker.job_title})</span></label>)}</div>}</div>}
          <div className="flex gap-2"><Button onClick={saveJob} disabled={savingJob}><Save className="mr-2 h-4 w-4" />{savingJob ? "Guardando..." : editingJobId ? "Guardar cambios" : "Crear trabajo"}</Button>{editingJobId && <Button variant="outline" onClick={() => { setEditingJobId(null); setJobForm(emptyJobForm) }}>Cancelar</Button>}</div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Trabajos registrados ({jobs.length})</CardTitle><CardDescription>El badge siempre muestra el texto del estado, no solo un color.</CardDescription></CardHeader><CardContent>
          {loading ? <div className="flex justify-center gap-3 py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" />Cargando trabajos...</div> : jobs.length === 0 ? <div className="py-12 text-center text-muted-foreground"><BriefcaseBusiness className="mx-auto mb-3 h-10 w-10" />Aun no hay trabajos registrados.</div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Trabajo</TableHead><TableHead>Cliente</TableHead><TableHead>Valor</TableHead><TableHead>Participantes</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{jobs.map((job) => <TableRow key={job.id}><TableCell className="font-medium">{job.name}<span className="mt-1 block text-xs text-muted-foreground">Inicio: {formatDate(job.start_date)}</span></TableCell><TableCell>{job.client_name || "Sin cliente"}</TableCell><TableCell>{formatMoney(job.agreed_value)}</TableCell><TableCell>{job.worker_count || 0}</TableCell><TableCell><Badge variant={statusVariant(job.status)}>{statusLabels[job.status]}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => editJob(job)}>Editar</Button><Button variant="outline" size="sm" onClick={() => loadJob(job.id)}>Detalle</Button></div></TableCell></TableRow>)}</TableBody></Table></div>}
        </CardContent></Card>
        {selectedJob && <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{selectedJob.name}</CardTitle><CardDescription>Detalle basico, participantes e historial de estados.</CardDescription></div><Badge variant={statusVariant(selectedJob.status)}>{statusLabels[selectedJob.status]}</Badge></div></CardHeader><CardContent className="space-y-6">
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-muted-foreground">Cliente</p><p>{selectedJob.client_name || "Sin cliente registrado"}</p></div><div><p className="text-muted-foreground">Valor acordado</p><p>{formatMoney(selectedJob.agreed_value)}</p></div><div><p className="text-muted-foreground">Fecha inicial</p><p>{formatDate(selectedJob.start_date)}</p></div><div><p className="text-muted-foreground">Finalizacion</p><p>{formatDate(selectedJob.end_date)}</p></div></div>
          {selectedJob.status !== "completed" && <Button onClick={changeStatus}>Cambiar a {selectedJob.status === "accepted" ? "En proceso" : "Finalizado"}</Button>}
          <div className="space-y-3 border-t border-border pt-5"><div><h3 className="font-semibold">Trabajadores asignados</h3><p className="text-sm text-muted-foreground">La asignacion no registra asistencia ni pagos.</p></div>{selectedJob.workers?.length ? <div className="flex flex-wrap gap-2">{selectedJob.workers.map((worker) => <div key={worker.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><span>{worker.name} <span className="text-muted-foreground">({worker.job_title})</span></span><button className="text-muted-foreground hover:text-destructive" aria-label={`Quitar a ${worker.name}`} onClick={() => removeWorker(worker.id)}><X className="h-4 w-4" /></button></div>)}</div> : <p className="text-sm text-muted-foreground">No hay trabajadores asignados.</p>}{availableWorkers.length > 0 && <div className="rounded-lg border border-border p-4"><p className="mb-3 text-sm font-medium">Agregar trabajadores activos</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{availableWorkers.map((worker) => <label key={worker.id} className="flex items-center gap-2 text-sm"><Checkbox checked={assignmentIds.includes(worker.id)} onCheckedChange={() => toggleId(worker.id, assignmentIds, setAssignmentIds)} />{worker.name}</label>)}</div><Button className="mt-4" size="sm" variant="outline" disabled={assignmentIds.length === 0} onClick={assignWorkers}><UserRoundCheck className="mr-2 h-4 w-4" />Asignar seleccionados</Button></div>}</div>
          <div className="space-y-3 border-t border-border pt-5"><h3 className="font-semibold">Historial de estados</h3><div className="space-y-2">{selectedJob.status_history?.map((entry) => <div key={entry.id} className="flex flex-wrap items-center gap-2 text-sm"><Badge variant="outline">{entry.previous_status ? statusLabels[entry.previous_status] : "Creado"}</Badge><span className="text-muted-foreground">a</span><Badge variant={statusVariant(entry.new_status)}>{statusLabels[entry.new_status]}</Badge><span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.changed_at))}</span></div>)}</div></div>
        </CardContent></Card>}
      </TabsContent>
      <TabsContent value="attendance" className="space-y-6">
        <WorkAttendanceView jobs={jobs} />
      </TabsContent>
      <TabsContent value="expenses" className="space-y-6">
        <JobExpensesView jobs={jobs} />
      </TabsContent>
      <TabsContent value="payments" className="space-y-6"><JobClientPaymentsView jobs={jobs} /></TabsContent>
    </Tabs>
  )
}
