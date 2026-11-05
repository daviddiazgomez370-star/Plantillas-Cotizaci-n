import Link from "next/link"
import { ArrowRight, Calculator, FileText, PenLine, ReceiptText } from "lucide-react"
import { AppShell } from "@/components/app-shell"

const templates = [
  {
    href: "/cotizacion",
    title: "Cotización",
    description: "Prepara una propuesta con productos, cantidades y cálculos automáticos.",
    icon: Calculator,
    tone: "bg-emerald-400/10 text-primary",
  },
  {
    href: "/documento-libre",
    title: "Documento libre",
    description: "Crea presupuestos, propuestas o documentos personalizados desde cero.",
    icon: PenLine,
    tone: "bg-sky-400/10 text-sky-300",
  },
  {
    href: "/cuenta-cobro",
    title: "Cuenta de cobro",
    description: "Registra un cobro profesional y genera un documento listo para compartir.",
    icon: ReceiptText,
    tone: "bg-violet-400/10 text-violet-300",
  },
]

export default function PlantillasPage() {
  return (
    <AppShell title="Plantillas" description="Elige el formato que necesitas para iniciar un nuevo documento.">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map(({ href, title, description, icon: Icon, tone }) => (
          <Link key={href} href={href} className="dashboard-card group flex min-h-60 flex-col">
            <div className={`mb-8 inline-flex w-fit rounded-xl p-3 ${tone}`}><Icon className="h-6 w-6" /></div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-primary">Usar plantilla <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </section>
      <section className="dashboard-card mt-6 flex items-start gap-4">
        <div className="rounded-xl bg-secondary p-3 text-sky-300"><FileText className="h-5 w-5" /></div>
        <div><h2 className="font-semibold">Documentos guardados</h2><p className="mt-1 text-sm text-muted-foreground">Puedes consultar, editar o convertir tus documentos en el portafolio.</p><Link href="/portafolio" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Ver portafolio</Link></div>
      </section>
    </AppShell>
  )
}
