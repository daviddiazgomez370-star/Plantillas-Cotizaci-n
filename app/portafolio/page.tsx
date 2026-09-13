import { PortfolioView } from "@/components/portfolio-view"
import { AppShell } from "@/components/app-shell"

export default function PortafolioPage() {
  return (
    <AppShell title="Portafolio" description="Consulta, edita y convierte tus documentos comerciales desde un solo lugar.">
      <PortfolioView />
    </AppShell>
  )
}
