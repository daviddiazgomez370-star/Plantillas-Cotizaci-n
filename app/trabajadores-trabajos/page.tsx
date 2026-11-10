import { AppShell } from "@/components/app-shell"
import { WorkersJobsView } from "@/components/workers-jobs-view"

export default function WorkersJobsPage() {
  return (
    <AppShell
      title="Trabajadores y trabajos"
      description="Administra tu equipo, sus tipos de remuneracion y los trabajos en curso sin mezclar la operacion con pagos o nomina."
    >
      <WorkersJobsView />
    </AppShell>
  )
}
