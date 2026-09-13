import { ClientsView } from "@/components/clients-view"
import { AppShell } from "@/components/app-shell"

export default function ClientsPage() {
  return (
    <AppShell title="Clientes" description="Conserva los datos de tus clientes para agilizar cada documento comercial.">
      <ClientsView />
    </AppShell>
  )
}
