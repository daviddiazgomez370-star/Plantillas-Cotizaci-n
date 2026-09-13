import { ConfigurationForm } from "@/components/configuration-form"
import { AppShell } from "@/components/app-shell"

export default function ConfigurationPage() {
  return (
    <AppShell title="Configuración" description="Administra los datos de tu empresa, valores base y accesorios disponibles.">
      <ConfigurationForm />
    </AppShell>
  )
}
