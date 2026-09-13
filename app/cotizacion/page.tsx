import { QuotationForm } from "@/components/quotation-form"
import { AppShell } from "@/components/app-shell"

export default function QuotationPage() {
  return (
    <AppShell title="Nueva cotización" description="Crea una propuesta detallada para tu cliente y calcula sus valores automáticamente.">
      <QuotationForm />
    </AppShell>
  )
}
