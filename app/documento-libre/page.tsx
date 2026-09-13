import { Suspense } from "react"
import { FreeDocumentForm } from "@/components/free-document-form"
import { AppShell } from "@/components/app-shell"

export default function FreeDocumentPage() {
  return (
    <AppShell title="Documento libre" description="Prepara presupuestos, propuestas o documentos personalizados con total libertad.">
      <Suspense fallback={<p className="py-8 text-center text-muted-foreground">Cargando...</p>}>
          <FreeDocumentForm />
      </Suspense>
    </AppShell>
  )
}
