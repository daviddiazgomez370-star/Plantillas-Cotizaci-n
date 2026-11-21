"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CalendarDays, ChevronDown, ChevronUp, Loader2, ReceiptText, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { Job, PendingWorkerPaymentDay, Worker, WorkerPayment } from "@/lib/database"
import { toast } from "@/hooks/use-toast"

type WorkerPaymentsResponse = {
  job: Job
  payments: WorkerPayment[]
  pending_days: PendingWorkerPaymentDay[]
}

type WorkerPaymentsViewProps = { jobs: Job[] }

const jobStatusLabels: Record<Job["status"], string> = {
  accepted: "Aceptado",
  in_progress: "En proceso",
  completed: "Finalizado",
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatMoney(value: number | string | undefined) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value || 0))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json()
    return body.error || fallback
  } catch {
    return fallback
  }
}

export function WorkerPaymentsView({ jobs }: WorkerPaymentsViewProps) {
  const [jobId, setJobId] = useState("")
  const [data, setData] = useState<WorkerPaymentsResponse | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [workerId, setWorkerId] = useState("")
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<string[]>([])
  const [paymentDate, setPaymentDate] = useState(today)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedPaymentIds, setExpandedPaymentIds] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!jobId) {
      setData(null)
      setWorkers([])
      setLoadError(null)
      return
    }

    setLoading(true)
    setLoadError(null)
    try {
      const [paymentsResponse, workersResponse] = await Promise.all([
        fetch(`/api/jobs/${jobId}/worker-payments`),
        fetch("/api/workers"),
      ])
      if (!paymentsResponse.ok) throw new Error(await errorMessage(paymentsResponse, "No se pudieron cargar los pagos a trabajadores"))
      if (!workersResponse.ok) throw new Error(await errorMessage(workersResponse, "No se pudieron cargar los trabajadores"))
      setData(await paymentsResponse.json() as WorkerPaymentsResponse)
      setWorkers(await workersResponse.json() as Worker[])
    } catch (error: unknown) {
      setData(null)
      setWorkers([])
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los pagos a trabajadores")
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    void load()
  }, [load])

  const payableWorkers = useMemo(() => {
    if (!data) return []
    const relevantIds = new Set([
      ...(data.job.workers || []).map((worker) => worker.id),
      ...data.pending_days.map((day) => day.worker_id),
    ])
    return workers
      .filter((worker) => relevantIds.has(worker.id) && worker.compensation_type === "daily_rate")
      .sort((left, right) => left.name.localeCompare(right.name, "es"))
  }, [data, workers])

  const selectedWorker = useMemo(
    () => payableWorkers.find((worker) => worker.id === workerId) || null,
    [payableWorkers, workerId]
  )

  const pendingDays = useMemo(
    () => data?.pending_days.filter((day) => day.worker_id === workerId) || [],
    [data, workerId]
  )

  const selectedDays = useMemo(
    () => pendingDays.filter((day) => selectedAttendanceIds.includes(day.attendance_id)),
    [pendingDays, selectedAttendanceIds]
  )

  const currentRate = Number(selectedWorker?.daily_rate || 0)
  const totalEstimated = selectedDays.length * currentRate
  const allPendingSelected = pendingDays.length > 0 && selectedAttendanceIds.length === pendingDays.length

  const chooseJob = (nextJobId: string) => {
    setJobId(nextJobId)
    setWorkerId("")
    setSelectedAttendanceIds([])
    setPaymentDate(today())
    setNote("")
    setExpandedPaymentIds([])
  }

  const chooseWorker = (nextWorkerId: string) => {
    setWorkerId(nextWorkerId)
    setSelectedAttendanceIds([])
  }

  const toggleAttendance = (attendanceId: string) => {
    setSelectedAttendanceIds((current) => current.includes(attendanceId)
      ? current.filter((id) => id !== attendanceId)
      : [...current, attendanceId])
  }

  const toggleAll = () => {
    setSelectedAttendanceIds(allPendingSelected ? [] : pendingDays.map((day) => day.attendance_id))
  }

  const registerPayment = async () => {
    if (!data || !selectedWorker || selectedAttendanceIds.length === 0) return

    setSaving(true)
    try {
      const response = await fetch(`/api/jobs/${data.job.id}/worker-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: selectedWorker.id,
          payment_date: paymentDate,
          attendance_ids: selectedAttendanceIds,
          note: note || undefined,
        }),
      })
      if (!response.ok) {
        const message = await errorMessage(response, "No se pudo registrar el pago al trabajador")
        if (response.status === 409) {
          setSelectedAttendanceIds([])
          await load()
        }
        throw new Error(message)
      }
      toast({ title: "Pago registrado", description: "Los días pagados fueron actualizados en el historial." })
      setSelectedAttendanceIds([])
      setNote("")
      await load()
    } catch (error: unknown) {
      toast({
        title: "No se pudo registrar el pago",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const deletePayment = async () => {
    if (!data || !deletingId) return

    const paymentId = deletingId
    setDeletingId(null)
    try {
      const response = await fetch(`/api/jobs/${data.job.id}/worker-payments/${paymentId}`, { method: "DELETE" })
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo eliminar el pago al trabajador"))
      toast({ title: "Pago eliminado", description: "Sus días trabajados vuelven a estar pendientes de pago." })
      setSelectedAttendanceIds([])
      setExpandedPaymentIds((current) => current.filter((id) => id !== paymentId))
      await load()
    } catch (error: unknown) {
      toast({
        title: "No se pudo eliminar el pago",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      })
    }
  }

  const togglePaymentDetails = (paymentId: string) => {
    setExpandedPaymentIds((current) => current.includes(paymentId)
      ? current.filter((id) => id !== paymentId)
      : [...current, paymentId])
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pagos a trabajadores</CardTitle>
          <CardDescription>Dinero que sale para remunerar días trabajados. Es independiente de los cobros recibidos del cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xl space-y-2">
            <Label htmlFor="worker-payment-job">Trabajo</Label>
            <select
              id="worker-payment-job"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={jobId}
              onChange={(event) => chooseJob(event.target.value)}
            >
              <option value="">Selecciona un trabajo</option>
              {jobs.map((job) => <option key={job.id} value={job.id}>{job.name} — {jobStatusLabels[job.status]}</option>)}
            </select>
          </div>

          {data && <div className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-muted-foreground">Trabajo</p><p className="font-medium">{data.job.name}</p>{data.job.description && <p className="mt-1 text-xs text-muted-foreground">{data.job.description}</p>}</div>
            <div><p className="text-muted-foreground">Estado operativo</p><Badge variant={data.job.status === "completed" ? "secondary" : data.job.status === "in_progress" ? "default" : "outline"}>{jobStatusLabels[data.job.status]}</Badge></div>
            <div><p className="text-muted-foreground">Valor acordado</p><p>{formatMoney(data.job.agreed_value)}</p></div>
            <div><p className="text-muted-foreground">Días pendientes</p><p>{data.pending_days.length}</p></div>
          </div>}

          {data?.job.status === "completed" && <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">El trabajo está <strong>Finalizado</strong>, pero los días trabajados pendientes todavía pueden pagarse.</p>}
          {!jobId && <p className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">Selecciona un trabajo para consultar los días trabajados pendientes de pago.</p>}
        </CardContent>
      </Card>

      {jobId && <>
        {loadError && <Card className="border-destructive"><CardContent className="flex items-start gap-3 py-4"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><p className="font-semibold text-destructive">No fue posible cargar los pagos a trabajadores</p><p className="mt-1 text-sm text-muted-foreground">{loadError}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>Reintentar</Button></div></CardContent></Card>}

        {loading ? <Card><CardContent className="flex justify-center gap-3 py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" />Cargando pagos a trabajadores...</CardContent></Card> : data && <>
          <Card>
            <CardHeader>
              <CardTitle>Registrar pago por días trabajados</CardTitle>
              <CardDescription>Solo se muestran trabajadores con tarifa diaria. El total es una estimación: el servidor calcula y guarda el pago final.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {payableWorkers.length === 0 ? <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">No hay trabajadores con remuneración diaria disponibles para pagos en este trabajo.</p> : <>
                <div className="max-w-xl space-y-2">
                  <Label htmlFor="worker-payment-worker">Trabajador con tarifa diaria</Label>
                  <select id="worker-payment-worker" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={workerId} onChange={(event) => chooseWorker(event.target.value)}>
                    <option value="">Selecciona un trabajador</option>
                    {payableWorkers.map((worker) => {
                      const pendingCount = data.pending_days.filter((day) => day.worker_id === worker.id).length
                      return <option key={worker.id} value={worker.id}>{worker.name} — {formatMoney(worker.daily_rate)} · {pendingCount} pendiente(s)</option>
                    })}
                  </select>
                </div>

                {selectedWorker && <div className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-3">
                  <div><p className="text-muted-foreground">Trabajador</p><p className="font-medium">{selectedWorker.name}</p><p className="text-xs text-muted-foreground">{selectedWorker.job_title}</p></div>
                  <div><p className="text-muted-foreground">Remuneración</p><p>Tarifa diaria</p></div>
                  <div><p className="text-muted-foreground">Tarifa diaria actual</p><p>{formatMoney(selectedWorker.daily_rate)}</p></div>
                </div>}

                {selectedWorker && (pendingDays.length === 0 ? <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">No hay días trabajados pendientes de pago para este trabajador.</p> : <>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div><h3 className="font-medium">Días trabajados pendientes</h3><p className="text-sm text-muted-foreground">Selecciona uno o varios días para incluirlos en el pago.</p></div>
                      <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={allPendingSelected} onCheckedChange={toggleAll} aria-label="Seleccionar todos los días pendientes" />Seleccionar todos</label>
                    </div>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader><TableRow><TableHead className="w-12">Seleccionar</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Tarifa diaria actual</TableHead><TableHead>Importe estimado</TableHead></TableRow></TableHeader>
                        <TableBody>{pendingDays.map((day) => <TableRow key={day.attendance_id}>
                          <TableCell><Checkbox checked={selectedAttendanceIds.includes(day.attendance_id)} onCheckedChange={() => toggleAttendance(day.attendance_id)} aria-label={`Seleccionar día trabajado del ${formatDate(day.work_date)}`} /></TableCell>
                          <TableCell>{formatDate(day.work_date)}</TableCell>
                          <TableCell><Badge>Trabajado</Badge></TableCell>
                          <TableCell>{formatMoney(currentRate)}</TableCell>
                          <TableCell>{formatMoney(currentRate)}</TableCell>
                        </TableRow>)}</TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4 md:grid-cols-3">
                    <div><p className="text-sm text-muted-foreground">Días seleccionados</p><p className="text-xl font-semibold">{selectedDays.length}</p></div>
                    <div><p className="text-sm text-muted-foreground">Tarifa diaria actual</p><p className="text-xl font-semibold">{formatMoney(currentRate)}</p></div>
                    <div><p className="text-sm text-muted-foreground">Total estimado a pagar</p><p className="text-xl font-semibold">{formatMoney(totalEstimated)}</p><p className="text-xs text-muted-foreground">{selectedDays.length} día(s) × {formatMoney(currentRate)}</p></div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="worker-payment-date">Fecha de pago</Label><Input id="worker-payment-date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="worker-payment-note">Nota opcional</Label><Textarea id="worker-payment-note" value={note} maxLength={1000} placeholder="Ej. Pago de días de instalación" onChange={(event) => setNote(event.target.value)} /></div>
                  </div>
                  <Button disabled={!selectedWorker || selectedAttendanceIds.length === 0 || saving} onClick={() => void registerPayment()}><ReceiptText className="mr-2 h-4 w-4" />{saving ? "Registrando pago..." : "Registrar pago"}</Button>
                </>)}
              </>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Historial de pagos a trabajadores</CardTitle><CardDescription>Los valores históricos usan la tarifa guardada al registrar cada pago, no la tarifa diaria actual.</CardDescription></CardHeader>
            <CardContent>{data.payments.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay pagos registrados.</p> : <div className="space-y-3">{data.payments.map((payment) => {
              const expanded = expandedPaymentIds.includes(payment.id)
              return <div key={payment.id} className="rounded-lg border border-border">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid gap-2 text-sm sm:grid-cols-4 sm:gap-x-8">
                    <div><p className="text-muted-foreground">Fecha de pago</p><p className="font-medium">{formatDate(payment.payment_date)}</p></div>
                    <div><p className="text-muted-foreground">Trabajador</p><p className="font-medium">{payment.worker_name}</p><p className="text-xs text-muted-foreground">{payment.worker_job_title}</p></div>
                    <div><p className="text-muted-foreground">Días incluidos</p><p>{payment.days.length}</p></div>
                    <div><p className="text-muted-foreground">Total pagado</p><p className="font-semibold">{formatMoney(payment.total_amount)}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => togglePaymentDetails(payment.id)}>{expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}{expanded ? "Ocultar días" : "Ver días"}</Button><Button size="sm" variant="outline" onClick={() => setDeletingId(payment.id)}><Trash2 className="mr-1 h-4 w-4" />Eliminar</Button></div>
                </div>
                {payment.note && <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">Nota: {payment.note}</p>}
                {expanded && <div className="border-t border-border p-4"><p className="mb-3 text-sm font-medium">Días incluidos y tarifa histórica</p><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Fecha trabajada</TableHead><TableHead>Tarifa histórica</TableHead><TableHead>Importe pagado</TableHead></TableRow></TableHeader><TableBody>{payment.days.map((day) => <TableRow key={day.id}><TableCell>{formatDate(day.work_date)}</TableCell><TableCell>{formatMoney(day.daily_rate_snapshot)}</TableCell><TableCell>{formatMoney(day.amount)}</TableCell></TableRow>)}</TableBody></Table></div></div>}
              </div>
            })}</div>}</CardContent>
          </Card>
        </>}
      </>}

      <AlertDialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle><AlertDialogDescription>Se eliminará el registro del pago. Las asistencias no se eliminarán: los días trabajados asociados volverán a quedar pendientes de pago.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void deletePayment()}>Eliminar pago</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
