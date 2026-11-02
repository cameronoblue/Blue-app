import { Link, NavLink, Outlet } from 'react-router'
import { ArrowLeft, ChartNoAxesCombined, ListPlus } from 'lucide-react'

export function LogLayout() {
  return <div className="space-y-6">
    <Link to="/apps" className="inline-flex min-h-10 items-center gap-2 text-xs text-muted-foreground hover:text-primary"><ArrowLeft size={14} />All apps</Link>
    <nav aria-label="Log app navigation" className="flex gap-1 rounded-xl border bg-card p-1">
      {[{ to: '/log', label: 'Events', icon: ListPlus }, { to: '/log/data', label: 'Data', icon: ChartNoAxesCombined }].map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end className={({ isActive }) => `flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Icon size={17} />{label}</NavLink>)}
    </nav>
    <Outlet />
  </div>
}
