"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calculator, FileText, FolderOpen, LayoutDashboard, ReceiptText, Settings, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/cotizacion", label: "Cotizaciones", icon: Calculator },
  { href: "/documento-libre", label: "Documento libre", icon: FileText },
  { href: "/cuenta-cobro", label: "Cuentas de cobro", icon: ReceiptText },
  { href: "/portafolio", label: "Portafolio", icon: FolderOpen },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/configuracion", label: "Configuración", icon: Settings },
]

type AppShellProps = { title: string; description: string; children: ReactNode; action?: ReactNode }

export function AppShell({ title, description, children, action }: AppShellProps) {
  const pathname = usePathname()
  return (
    <div className="app-shell min-h-screen">
      <aside className="app-sidebar hidden lg:flex">
        <Link href="/" className="brand-mark"><span className="brand-symbol">N</span><span><strong>Nexo</strong><small>cotizaciones</small></span></Link>
        <nav className="mt-10 flex flex-1 flex-col gap-1" aria-label="Navegación principal">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href)
            return <Link key={href} href={href} className={cn("nav-item", active && "nav-item-active")}><Icon className="h-[18px] w-[18px]" />{label}</Link>
          })}
        </nav>
        <div className="sidebar-footer"><span className="status-dot" /> Sistema listo</div>
      </aside>
      <div className="min-w-0 lg:pl-[272px]">
        <header className="topbar"><Link href="/" className="brand-mark lg:hidden"><span className="brand-symbol">N</span><strong>Nexo</strong></Link><p className="hidden text-sm text-muted-foreground sm:block">Espacio de trabajo comercial</p><Link href="/cotizacion" className="quick-action">Nueva cotización</Link></header>
        <main className="page-content"><div className="page-heading"><div><p className="eyebrow">Gestión comercial</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action && <div className="page-action">{action}</div>}</div>{children}</main>
      </div>
    </div>
  )
}
