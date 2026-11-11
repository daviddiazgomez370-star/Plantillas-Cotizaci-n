"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AttendanceCount, AttendanceStatus, Job, WorkAttendance } from "@/lib/database"
import { toast } from "@/hooks/use-toast"

type AttendanceResponse = {
  job: Job
  records: WorkAttendance[]
  counts: AttendanceCount[]
}

type AttendanceDraft = {
  status: AttendanceStatus | ""
  note: string
}

type WorkAttendanceViewProps = {
  jobs: Job[]
}

const attendanceLabels: Record<AttendanceStatus, string> = {
  worked: "Trabajado",
  not_worked: "No trabajado",
}

const jobStatusLabels: Record<Job["status"], string> = {
  accepted: "Aceptado",
  in_progress: "En proceso",
  completed: "Finalizado",
}

const emptyAttendanceRecords: WorkAttendance[] = []

function toCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day, 12)
}

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function monthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(toCalendarDate(value))
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json()
    return body.error || fallback
  } catch {
    return fallback
  }
}

export function WorkAttendanceView({ jobs }: WorkAttendanceViewProps) {
  const [selectedJobId, setSelectedJobId] = useState("")
  const [job, setJob] = useState<Job | null>(null)
  const [records, setRecords] = useState<WorkAttendance[]>([])
  const [counts, setCounts] = useState<AttendanceCount[]>([])
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => toDateValue(new Date()))
  const [workerFilter, setWorkerFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "">("")
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const selectedMonth = monthValue(calendarMonth)

  const loadAttendance = useCallback(async () => {
    if (!selectedJobId) {
      setJob(null)
      setRecords([])
      setCounts([])
      return
    }

    setLoading(true)
    setLoadError(null)
    try {
      const search = new URLSearchParams({ month: selectedMonth })
      if (workerFilter) search.set("worker_id", workerFilter)
      if (statusFilter) search.set("status", statusFilter)
      const response = await fetch(`/api/jobs/${selectedJobId}/attendance?${search.toString()}`)
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo consultar la asistencia"))
      const data = await response.json() as AttendanceResponse
      setJob(data.job)
      setRecords(data.records)
      setCounts(data.counts)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo consultar la asistencia"
      setLoadError(message)
      setJob(null)
      setRecords([])
      setCounts([])
    } finally {
      setLoading(false)
    }
  }, [selectedJobId, selectedMonth, statusFilter, workerFilter])

  useEffect(() => {
    void loadAttendance()
  }, [loadAttendance])

  const recordsByDate = useMemo(() => {
    const grouped = new Map<string, WorkAttendance[]>()
    for (const record of records) {
      const entries = grouped.get(record.work_date) || []
      entries.push(record)
      grouped.set(record.work_date, entries)
    }
    return grouped
  }, [records])

  const selectedDayRecords = useMemo(
    () => recordsByDate.get(selectedDate) || emptyAttendanceRecords,
    [recordsByDate, selectedDate]
  )
  const attendanceDays = useMemo(
    () => [...recordsByDate.keys()].map(toCalendarDate),
    [recordsByDate]
  )

  useEffect(() => {
    const nextDrafts: Record<string, AttendanceDraft> = {}
    for (const worker of job?.workers || []) {
      const record = selectedDayRecords.find((entry) => entry.worker_id === worker.id)
      nextDrafts[worker.id] = { status: record?.status || "", note: record?.note || "" }
    }
    setDrafts(nextDrafts)
  }, [job, selectedDate, selectedDayRecords])

  const filterWorkers = useMemo(() => {
    const workers = new Map<string, { id: string; name: string; job_title: string }>()
    for (const worker of job?.workers || []) workers.set(worker.id, worker)
    for (const record of records) {
      if (!workers.has(record.worker_id)) {
        workers.set(record.worker_id, { id: record.worker_id, name: record.worker_name, job_title: record.worker_job_title })
      }
    }
    return [...workers.values()].sort((left, right) => left.name.localeCompare(right.name, "es"))
  }, [job, records])

  const canEdit = job?.status === "in_progress"

  const updateDraft = (workerId: string, update: Partial<AttendanceDraft>) => {
    setDrafts((current) => ({
      ...current,
      [workerId]: { status: current[workerId]?.status || "", note: current[workerId]?.note || "", ...update },
    }))
  }

  const saveAttendance = async () => {
    if (!job) return
    const attendanceRecords = (job.workers || [])
      .filter((worker) => worker.is_active)
      .map((worker) => ({ worker_id: worker.id, ...drafts[worker.id] }))
      .filter((record): record is { worker_id: string; status: AttendanceStatus; note: string } => record.status !== "")

    if (attendanceRecords.length === 0) {
      toast({ title: "Selecciona al menos un estado de asistencia", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_date: selectedDate, records: attendanceRecords }),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo guardar la asistencia"))
      const result = await response.json() as { created: number; updated: number }
      toast({
        title: "Asistencia guardada",
        description: `${result.created} creado(s), ${result.updated} actualizado(s).`,
      })
      await loadAttendance()
    } catch (error: unknown) {
      toast({
        title: "No se pudo guardar la asistencia",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Días trabajados</CardTitle>
          <CardDescription>Registra y consulta la asistencia por trabajo y fecha. Esta información no calcula nómina ni pagos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xl space-y-2">
            <Label htmlFor="attendance-job">Trabajo</Label>
            <select
              id="attendance-job"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedJobId}
              onChange={(event) => {
                setSelectedJobId(event.target.value)
                setWorkerFilter("")
                setStatusFilter("")
              }}
            >
              <option value="">Selecciona un trabajo</option>
              {jobs.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} — {jobStatusLabels[entry.status]}</option>)}
            </select>
          </div>
          {job && <div className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-muted-foreground">Trabajo</p><p className="font-medium">{job.name}</p></div>
            <div><p className="text-muted-foreground">Estado</p><Badge variant={job.status === "in_progress" ? "default" : job.status === "completed" ? "secondary" : "outline"}>{jobStatusLabels[job.status]}</Badge></div>
            <div><p className="text-muted-foreground">Valor acordado</p><p>{formatMoney(job.agreed_value)}</p></div>
            <div><p className="text-muted-foreground">Trabajadores asignados</p><p>{job.workers?.length || 0}</p></div>
          </div>}
          {job?.status === "accepted" && <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">Este trabajo está <strong>Aceptado</strong>. La asistencia podrá registrarse cuando cambie a <strong>En proceso</strong>.</p>}
          {job?.status === "completed" && <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">Este trabajo está <strong>Finalizado</strong>. El historial permanece visible, pero no puede modificarse.</p>}
        </CardContent>
      </Card>

      {selectedJobId && <>
        {loadError && <Card className="border-destructive"><CardContent className="flex items-start gap-3 py-4"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><p className="font-semibold text-destructive">No fue posible cargar la asistencia</p><p className="mt-1 text-sm text-muted-foreground">{loadError}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void loadAttendance()}>Reintentar</Button></div></CardContent></Card>}

        {loading ? <Card><CardContent className="flex justify-center gap-3 py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" />Cargando asistencia...</CardContent></Card> : job && <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />Calendario</CardTitle><CardDescription>Elige una fecha de {formatMonth(calendarMonth)}.</CardDescription></CardHeader>
              <CardContent className="flex justify-center px-3 pb-5 sm:px-5">
                <Calendar
                  mode="single"
                  selected={toCalendarDate(selectedDate)}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  onSelect={(date) => date && setSelectedDate(toDateValue(date))}
                  modifiers={{ withAttendance: attendanceDays }}
                  modifiersClassNames={{ withAttendance: "relative after:absolute after:bottom-0.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary data-[selected=true]:after:bg-primary-foreground" }}
                  footer={<><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />Con asistencia</span><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-3 rounded border border-primary bg-primary" />Día seleccionado</span></>}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Registro del {formatDate(selectedDate)}</CardTitle><CardDescription>Marca los trabajadores asignados. Los trabajadores inactivos mantienen su historial, pero no reciben registros nuevos.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {!job.workers?.length ? <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Asigna trabajadores al trabajo antes de registrar asistencia.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Trabajador</TableHead><TableHead>Estado</TableHead><TableHead>Nota opcional</TableHead></TableRow></TableHeader><TableBody>{job.workers.map((worker) => {
                  const disabled = !canEdit || !worker.is_active
                  const draft = drafts[worker.id] || { status: "", note: "" }
                  return <TableRow key={worker.id}><TableCell className="font-medium">{worker.name}<span className="mt-1 block text-xs text-muted-foreground">{worker.job_title}{!worker.is_active ? " · Inactivo" : ""}</span></TableCell><TableCell><select aria-label={`Estado de ${worker.name}`} className="flex h-9 min-w-36 rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" value={draft.status} disabled={disabled} onChange={(event) => updateDraft(worker.id, { status: event.target.value as AttendanceStatus | "" })}><option value="">Sin registro</option><option value="worked">Trabajado</option><option value="not_worked">No trabajado</option></select></TableCell><TableCell><Input aria-label={`Nota de ${worker.name}`} value={draft.note} disabled={disabled} onChange={(event) => updateDraft(worker.id, { note: event.target.value })} maxLength={1000} placeholder="Ej. Trabajo suspendido por lluvia" /></TableCell></TableRow>
                })}</TableBody></Table></div>}
                {canEdit && <Button onClick={() => void saveAttendance()} disabled={saving || !job.workers?.some((worker) => worker.is_active)}><Save className="mr-2 h-4 w-4" />{saving ? "Guardando..." : "Guardar asistencia del día"}</Button>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Contadores de días trabajados</CardTitle><CardDescription>Conteo del período {formatMonth(calendarMonth)}; no incluye valores monetarios.</CardDescription></CardHeader>
            <CardContent>{counts.length === 0 ? <p className="text-sm text-muted-foreground">No hay trabajadores asignados ni registros históricos para este trabajo.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{counts.map((count) => <div key={count.worker_id} className="rounded-lg border border-border p-4"><p className="font-medium">{count.worker_name}</p><p className="text-sm text-muted-foreground">{count.worker_job_title}{!count.worker_is_active ? " · Inactivo" : ""}</p><p className="mt-3 flex items-center gap-2 text-lg font-semibold"><CheckCircle2 className="h-5 w-5 text-primary" />{count.worked_days} {count.worked_days === 1 ? "día trabajado" : "días trabajados"}</p></div>)}</div>}</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tabla de asistencia</CardTitle><CardDescription>La tabla y el calendario muestran los mismos registros persistidos para el período y filtros seleccionados.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="attendance-month">Mes</Label><Input id="attendance-month" type="month" value={selectedMonth} onChange={(event) => event.target.value && setCalendarMonth(toCalendarDate(`${event.target.value}-01`))} /></div>
                <div className="space-y-2"><Label htmlFor="attendance-worker-filter">Trabajador</Label><select id="attendance-worker-filter" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={workerFilter} onChange={(event) => setWorkerFilter(event.target.value)}><option value="">Todos los trabajadores</option>{filterWorkers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name} — {worker.job_title}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="attendance-status-filter">Estado</Label><select id="attendance-status-filter" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AttendanceStatus | "")}><option value="">Todos los estados</option><option value="worked">Trabajado</option><option value="not_worked">No trabajado</option></select></div>
              </div>
              {records.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No hay registros de asistencia para estos filtros.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Trabajador</TableHead><TableHead>Trabajo</TableHead><TableHead>Estado</TableHead><TableHead>Nota</TableHead></TableRow></TableHeader><TableBody>{records.map((record) => <TableRow key={record.id}><TableCell>{formatDate(record.work_date)}</TableCell><TableCell className="font-medium">{record.worker_name}<span className="mt-1 block text-xs text-muted-foreground">{record.worker_job_title}{!record.worker_is_active ? " · Inactivo" : ""}</span></TableCell><TableCell>{record.job_name}</TableCell><TableCell><Badge variant={record.status === "worked" ? "default" : "secondary"}>{attendanceLabels[record.status]}</Badge></TableCell><TableCell>{record.note || "—"}</TableCell></TableRow>)}</TableBody></Table></div>}
            </CardContent>
          </Card>
        </>}
      </>}
    </div>
  )
}
