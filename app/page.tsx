import Link from "next/link"
import { ArrowUpRight, Calculator, CircleDollarSign, FileText, FolderOpen, PenLine, ReceiptText, Users } from "lucide-react"
import { AppShell } from "@/components/app-shell"

const actions = [
  { href: "/cotizacion", title: "Nueva cotización", description: "Crea una propuesta con cálculos automáticos.", icon: Calculator, tone: "bg-emerald-400/10 text-primary" },
  { href: "/documento-libre", title: "Documento libre", description: "Redacta una propuesta a tu medida.", icon: PenLine, tone: "bg-sky-400/10 text-sky-300" },
  { href: "/cuenta-cobro", title: "Cuenta de cobro", description: "Registra y genera un cobro profesional.", icon: ReceiptText, tone: "bg-violet-400/10 text-violet-300" },
]

export default function HomePage() {
  return (
    <AppShell title="Buen día" description="Organiza tus propuestas, clientes y documentos comerciales desde aquí.">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="dashboard-card"><p className="text-sm text-muted-foreground">Documentos disponibles</p><p className="mt-3 text-3xl font-semibold">3 <span className="text-sm font-normal text-muted-foreground">formatos</span></p></div>
        <div className="dashboard-card"><p className="text-sm text-muted-foreground">Productos soportados</p><p className="mt-3 text-3xl font-semibold">5 <span className="text-sm font-normal text-muted-foreground">categorías</span></p></div>
        <div className="dashboard-card"><p className="text-sm text-muted-foreground">Estado del espacio</p><div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary"><span className="status-dot" /> Listo para trabajar</div></div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-4"><h2 className="text-lg font-semibold">Crear documento</h2><p className="mt-1 text-sm text-muted-foreground">Elige el flujo que necesitas iniciar.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            {actions.map(({ href, title, description, icon: Icon, tone }) => (
              <Link key={href} href={href} className="dashboard-card group block">
                <div className={`mb-6 inline-flex rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div>
                <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{title}</h3><ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" /></div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </Link>
            ))}
          </div>
          <div className="dashboard-card mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4"><div className="rounded-xl bg-secondary p-3 text-sky-300"><Users className="h-5 w-5" /></div><div><h2 className="font-semibold">Tu base de clientes</h2><p className="mt-1 text-sm text-muted-foreground">Guarda sus datos una vez y úsalos en cada documento.</p></div></div>
            <Link href="/clientes" className="text-sm font-semibold text-primary hover:underline">Gestionar clientes</Link>
          </div>
        </div>
        <aside className="dashboard-card h-fit">
          <div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><CircleDollarSign className="h-5 w-5" /></div><div><h2 className="font-semibold">Acceso rápido</h2><p className="text-xs text-muted-foreground">Herramientas del sistema</p></div></div>
          <div className="mt-6 divide-y divide-border">
            <Link href="/portafolio" className="flex items-center gap-3 py-4 text-sm text-muted-foreground transition hover:text-foreground"><FolderOpen className="h-4 w-4 text-primary" />Ver portafolio<ArrowUpRight className="ml-auto h-4 w-4" /></Link>
            <Link href="/configuracion" className="flex items-center gap-3 py-4 text-sm text-muted-foreground transition hover:text-foreground"><FileText className="h-4 w-4 text-primary" />Configurar empresa<ArrowUpRight className="ml-auto h-4 w-4" /></Link>
          </div>
        </aside>
      </section>
    </AppShell>
  )
}
