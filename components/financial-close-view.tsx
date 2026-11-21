"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, CircleX, Loader2, LockKeyhole, Save } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Job, JobFinancialClose, JobProfitShare } from "@/lib/database"
import { toast } from "@/hooks/use-toast"

type FinancialCloseResponse = {
  job: Job
  summary: {
    agreed_value: number
    client_collected: number
    client_balance: number
    expenses: number
    worker_payments: number
    projected_result: number
    distributable_profit: number
    has_positive_profit: boolean
  }
  profit_shares: JobProfitShare[]
  profit_share_total_percentage: number
  projected_shares: Array<{
    worker_id: string
    worker_name: string
    worker_job_title: string
    percentage: number
    amount: number
  }>
  pending_daily_rate_days: number
  requirements: {
    work_completed: boolean
    client_paid_in_full: boolean
    no_pending_daily_rate_days: boolean
    valid_profit_shares: boolean
    not_closed: boolean
  }
  can_close: boolean
  financial_close: JobFinancialClose | null
}

const jobStatusLabels: Record<Job["status"], string> = {
  accepted: "Aceptado",
  in_progress: "En proceso",
  completed: "Finalizado",
}

function formatMoney(value: number | string | undefined) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 }).format(Number(value || 0))
}

function formatDateTime(value: string) {
  const date = new Date(value.replace(" ", "T"))
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

function percentageMinor(value: string) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100 || Math.abs(numeric * 100 - Math.round(numeric * 100)) > 0.000_001) return null
  return Math.round(numeric * 100)
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json()
    return body.error || fallback
  } catch {
    return fallback
  }
}

export function FinancialCloseView({ jobs }: { jobs: Job[] }) {
  const [jobId, setJobId] = useState("")
  const [data, setData] = useState<FinancialCloseResponse | null>(null)
  const [shareDrafts, setShareDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [savingShares, setSavingShares] = useState(false)
  const [closing, setClosing] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!jobId) {
      setData(null)
      setShareDrafts({})
      setLoadError(null)
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(`/api/jobs/${jobId}/financial-close`)
      if (!response.ok) throw new Error(await errorMessage(response, "No se pudo consultar el cierre financiero"))
      const nextData = await response.json() as FinancialCloseResponse
      setData(nextData)
      setShareDrafts(Object.fromEntries(nextData.profit_shares.map((share) => [share.worker_id, String(share.percentage)])))
    } catch (error: unknown) {
      setData(null)
      setShareDrafts({})
      setLoadError(error instanceof Error ? error.message : "No se pudo consultar el cierre financiero")
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    void load()
  }, [load])

  const eligibleWorkers = useMemo(
    () => data?.job.workers?.filter((worker) => worker.compensation_type === "profit_share") || [],
    [data]
  )
  const selectedParticipants = useMemo(
    () => eligibleWorkers
      .map((worker) => ({ worker_id: worker.id, percentage: percentageMinor(shareDrafts[worker.id] || "") }))
      .filter((participant): participant is { worker_id: string; percentage: number } => participant.percentage !== null),
    [eligibleWorkers, shareDrafts]
  )
  const draftTotalMinor = selectedParticipants.reduce((total, participant) => total + participant.percentage, 0)
  const isDraftValid = selectedParticipants.length > 0 && draftTotalMinor === 10_000
  const isClosed = Boolean(data?.financial_close)
  const financialState = !data ? "" : isClosed ? "Cerrado" : data.can_close ? "Listo para cerrar" : data.summary.client_balance > 0 ? "Pendiente de cobro" : "Abierto"

  const chooseJob = (nextJobId: string) => {
    setJobId(nextJobId)
    setData(null)
    setShareDrafts({})
    setConfirmCloseOpen(false)
  }

  const saveShares = async () => {
    if (!data || isClosed || !isDraftValid) return
    setSavingShares(true)
    try {
      const response = await fetch(`/api/jobs/${data.job.id}/financial-close/shares`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: selectedParticipants.map((participant) => ({ worker_id: participant.worker_id, percentage: participant.percentage / 100 })) }),
      })
      if (!response.ok) {
        const message = await errorMessage(response, "No se pudo guardar el reparto")
        if (response.status === 409) await load()
        throw new Error(message)
      }
      toast({ title: "Reparto guardado", description: "La proyección fue actualizada con la configuración actual." })
      await load()
    } catch (error: unknown) {
      toast({ title: "No se pudo guardar el reparto", description: error instanceof Error ? error.message : "Intenta nuevamente.", variant: "destructive" })
    } finally {
      setSavingShares(false)
    }
  }

  const closeFinancially = async () => {
    if (!data || !data.can_close || isClosed) return
    setClosing(true)
    try {
      const response = await fetch(`/api/jobs/${data.job.id}/financial-close`, { method: "POST" })
      if (!response.ok) {
        const message = await errorMessage(response, "No se pudo realizar el cierre financiero")
        if (response.status === 409) await load()
        throw new Error(message)
      }
      toast({ title: "Cierre financiero realizado", description: "El resultado y el reparto quedaron congelados como snapshot histórico." })
      setConfirmCloseOpen(false)
      await load()
    } catch (error: unknown) {
      toast({ title: "No se pudo cerrar financieramente", description: error instanceof Error ? error.message : "Intenta nuevamente.", variant: "destructive" })
    } finally {
      setClosing(false)
    }
  }

  return <div className="space-y-6">
    <Card>
      <CardHeader><CardTitle>Cierre financiero</CardTitle><CardDescription>Consulta la proyección, configura el reparto de utilidad y realiza el cierre definitivo cuando se cumplan los requisitos.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xl space-y-2"><Label htmlFor="financial-close-job">Trabajo</Label><select id="financial-close-job" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={jobId} onChange={(event) => chooseJob(event.target.value)}><option value="">Selecciona un trabajo</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.name} — {jobStatusLabels[job.status]}</option>)}</select></div>
        {!jobId && <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">Selecciona un trabajo para consultar su estado financiero y proyección de reparto.</div>}
        {data && <div className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-muted-foreground">Trabajo</p><p className="font-medium">{data.job.name}</p></div><div><p className="text-muted-foreground">Estado operativo</p><Badge variant={data.job.status === "completed" ? "secondary" : data.job.status === "in_progress" ? "default" : "outline"}>{jobStatusLabels[data.job.status]}</Badge></div><div><p className="text-muted-foreground">Estado financiero</p><Badge variant={isClosed ? "default" : "outline"}>{financialState}</Badge></div><div><p className="text-muted-foreground">Valor acordado</p><p>{formatMoney(data.summary.agreed_value)}</p></div></div>}
      </CardContent>
    </Card>

    {jobId && <>
      {loadError && <Card className="border-destructive"><CardContent className="flex items-start gap-3 py-4"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><p className="font-semibold text-destructive">No fue posible cargar el cierre financiero</p><p className="mt-1 text-sm text-muted-foreground">{loadError}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>Reintentar</Button></div></CardContent></Card>}
      {loading ? <Card><CardContent className="flex justify-center gap-3 py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" />Cargando resumen financiero...</CardContent></Card> : data && <>
        {isClosed ? <ClosedSnapshot close={data.financial_close!} /> : <>
          <FinancialSummary data={data} />
          <ProfitShareConfiguration
            workers={eligibleWorkers}
            shareDrafts={shareDrafts}
            onChange={(workerId, value) => setShareDrafts((current) => ({ ...current, [workerId]: value }))}
            totalMinor={draftTotalMinor}
            canSave={isDraftValid}
            saving={savingShares}
            onSave={() => void saveShares()}
          />
          <ProjectedDistribution data={data} />
          <CloseRequirements data={data} />
          <Card><CardHeader><CardTitle>Cierre definitivo</CardTitle><CardDescription>El cierre congela el resultado y el reparto. No existe reapertura en esta fase.</CardDescription></CardHeader><CardContent className="space-y-3"><Button disabled={!data.can_close || closing} onClick={() => setConfirmCloseOpen(true)}><LockKeyhole className="mr-2 h-4 w-4" />{closing ? "Cerrando..." : "Cerrar financieramente"}</Button>{!data.can_close && <p className="text-sm text-muted-foreground">Completa los requisitos indicados antes de cerrar financieramente este trabajo.</p>}</CardContent></Card>
        </>}
      </>}
    </>}

    <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cerrar financieramente este trabajo?</AlertDialogTitle><AlertDialogDescription>Se congelarán el resultado financiero y el reparto de utilidad. Después del cierre no podrán modificarse gastos, cobros, pagos a trabajadores ni porcentajes de reparto. No existe reapertura en esta fase.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={closing}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={closing} onClick={() => void closeFinancially()}>Confirmar cierre</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}

function FinancialSummary({ data }: { data: FinancialCloseResponse }) {
  const { summary } = data
  return <Card><CardHeader><CardTitle>Resumen financiero</CardTitle><CardDescription>La información proviene del backend; el resultado sigue siendo una proyección hasta realizar el cierre.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><SummaryItem label="Valor acordado" value={formatMoney(summary.agreed_value)} /><SummaryItem label="Cobrado al cliente" value={formatMoney(summary.client_collected)} /><SummaryItem label="Saldo pendiente" value={formatMoney(summary.client_balance)} /><SummaryItem label="Gastos" value={formatMoney(summary.expenses)} /><SummaryItem label="Pagos a trabajadores" value={formatMoney(summary.worker_payments)} /><SummaryItem label="Resultado proyectado" value={formatMoney(summary.projected_result)} strong /></div>{summary.client_balance > 0 && <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">Faltan <strong>{formatMoney(summary.client_balance)}</strong> por cobrar al cliente. El cierre financiero todavía no está disponible.</div>}{summary.projected_result === 0 && <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">No existe utilidad positiva para repartir.</div>}{summary.projected_result < 0 && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">Resultado del trabajo: <strong>{formatMoney(summary.projected_result)}</strong>. No existe utilidad positiva para repartir.</div>}</CardContent></Card>
}

function SummaryItem({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="rounded-lg border border-border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className={strong ? "mt-1 text-lg font-semibold" : "mt-1 text-lg"}>{value}</p></div>
}

function ProfitShareConfiguration({ workers, shareDrafts, onChange, totalMinor, canSave, saving, onSave }: { workers: NonNullable<Job["workers"]>; shareDrafts: Record<string, string>; onChange: (workerId: string, value: string) => void; totalMinor: number; canSave: boolean; saving: boolean; onSave: () => void }) {
  const total = (totalMinor / 100).toFixed(2)
  return <Card><CardHeader><CardTitle>Configuración de reparto</CardTitle><CardDescription>Solo se incluyen trabajadores asignados con remuneración por reparto de utilidad. La suma debe ser exactamente 100.00%.</CardDescription></CardHeader><CardContent className="space-y-4">{workers.length === 0 ? <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">No hay trabajadores `profit_share` asignados a este trabajo.</p> : <><div className="space-y-3">{workers.map((worker) => <div key={worker.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,1fr)_12rem]"><div><p className="font-medium">{worker.name}</p><p className="text-sm text-muted-foreground">{worker.job_title} · Reparto de utilidad</p></div><div className="space-y-2"><Label htmlFor={`profit-share-${worker.id}`}>Porcentaje de {worker.name}</Label><div className="flex items-center gap-2"><Input id={`profit-share-${worker.id}`} type="number" min="0.01" max="100" step="0.01" inputMode="decimal" value={shareDrafts[worker.id] || ""} onChange={(event) => onChange(worker.id, event.target.value)} /><span aria-hidden="true">%</span></div></div></div>)}</div><div className={`rounded-md border p-3 text-sm ${canSave ? "border-border bg-muted/30" : "border-destructive/40 bg-destructive/5"}`}><strong>Total configurado: {total}%</strong><span className="ml-2 text-muted-foreground">{canSave ? "El reparto puede guardarse." : "Debe sumar exactamente 100.00%."}</span></div><Button disabled={!canSave || saving} onClick={onSave}><Save className="mr-2 h-4 w-4" />{saving ? "Guardando reparto..." : "Guardar reparto"}</Button></>}</CardContent></Card>
}

function ProjectedDistribution({ data }: { data: FinancialCloseResponse }) {
  return <Card><CardHeader><CardTitle>Reparto proyectado</CardTitle><CardDescription>Es una proyección de utilidad asignada; no representa pagos o transferencias a participantes.</CardDescription></CardHeader><CardContent className="space-y-4">{data.projected_shares.length === 0 ? <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Guarda una configuración de reparto válida al 100% para ver la proyección.</p> : <><div className="rounded-lg border border-border p-4"><p className="text-sm text-muted-foreground">Resultado proyectado</p><p className="text-xl font-semibold">{formatMoney(data.summary.projected_result)}</p>{!data.summary.has_positive_profit && <p className="mt-2 text-sm text-muted-foreground">No existe utilidad positiva para repartir; los montos asignados son $0.</p>}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.projected_shares.map((share) => <div key={share.worker_id} className="rounded-lg border border-border p-4"><p className="font-medium">{share.worker_name}</p><p className="text-sm text-muted-foreground">{share.worker_job_title}</p><p className="mt-3 text-sm text-muted-foreground">{share.percentage.toFixed(2)}%</p><p className="text-lg font-semibold">{formatMoney(share.amount)}</p></div>)}</div></>}</CardContent></Card>
}

function CloseRequirements({ data }: { data: FinancialCloseResponse }) {
  const requirements = [
    { ok: data.requirements.work_completed, text: data.requirements.work_completed ? "Trabajo finalizado" : "El trabajo debe estar Finalizado antes del cierre financiero." },
    { ok: data.requirements.client_paid_in_full, text: data.requirements.client_paid_in_full ? "Cliente pagó el 100%" : `Faltan ${formatMoney(data.summary.client_balance)} por cobrar al cliente.` },
    { ok: data.requirements.no_pending_daily_rate_days, text: data.requirements.no_pending_daily_rate_days ? "No hay días trabajados pendientes de pago" : `Hay ${data.pending_daily_rate_days} día(s) trabajado(s) pendiente(s) de pago. Regístralos en “Pagos a trabajadores”.` },
    { ok: data.requirements.valid_profit_shares, text: data.requirements.valid_profit_shares ? "Reparto configurado al 100%" : "El reparto debe incluir participantes profit_share y sumar exactamente 100.00%." },
  ]
  return <Card><CardHeader><CardTitle>Requisitos para cerrar</CardTitle><CardDescription>Estos requisitos son la respuesta actual del backend.</CardDescription></CardHeader><CardContent className="space-y-3">{requirements.map((requirement) => <div key={requirement.text} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">{requirement.ok ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <CircleX aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}<span><strong>{requirement.ok ? "Cumplido:" : "Pendiente:"}</strong> {requirement.text}</span></div>)}</CardContent></Card>
}

function ClosedSnapshot({ close }: { close: JobFinancialClose }) {
  return <><Card><CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5" />Cierre financiero</CardTitle><CardDescription>Cerrado el {formatDateTime(close.closed_at)}. Estos valores son snapshots históricos y no se recalculan.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><SummaryItem label="Valor acordado snapshot" value={formatMoney(close.agreed_value_snapshot)} /><SummaryItem label="Cobrado snapshot" value={formatMoney(close.client_collected_snapshot)} /><SummaryItem label="Gastos snapshot" value={formatMoney(close.expenses_snapshot)} /><SummaryItem label="Pagos trabajadores snapshot" value={formatMoney(close.worker_payments_snapshot)} /><SummaryItem label="Resultado final snapshot" value={formatMoney(close.result_snapshot)} strong /></div>{close.result_snapshot <= 0 && <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">No hubo utilidad positiva para repartir.</div>}</CardContent></Card><Card><CardHeader><CardTitle>Reparto definitivo asignado</CardTitle><CardDescription>Este cierre registra utilidad asignada. No representa un desembolso o transferencia de dinero a los participantes.</CardDescription></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{close.shares.map((share) => <div key={share.id} className="rounded-lg border border-border p-4"><p className="font-medium">{share.worker_name_snapshot}</p><p className="text-sm text-muted-foreground">{share.worker_job_title_snapshot}</p><p className="mt-3 text-sm text-muted-foreground">Porcentaje snapshot: {share.percentage_snapshot.toFixed(2)}%</p><p className="text-sm text-muted-foreground">Monto asignado</p><p className="text-lg font-semibold">{formatMoney(share.amount_snapshot)}</p></div>)}</div></CardContent></Card></>
}
