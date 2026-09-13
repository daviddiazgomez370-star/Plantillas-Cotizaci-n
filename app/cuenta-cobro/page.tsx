import { Suspense } from "react"
import { InvoiceForm } from "@/components/invoice-form"
import { AppShell } from "@/components/app-shell"

export default function InvoicePage() {
  return (
    <AppShell title="Cuenta de cobro" description="Registra el trabajo realizado y genera un documento listo para compartir.">
      <Suspense fallback={<p className="py-8 text-center text-muted-foreground">Cargando...</p>}>
          <InvoiceForm />
      </Suspense>
    </AppShell>
  )
}
