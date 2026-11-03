import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { LayoutGrid, Settings2, Layers, ChevronDown } from 'lucide-react'
import { apps } from '@/lib/apps'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export function WorkspaceNavigation({ collapsed = false, onNavigate }: { collapsed?: boolean, onNavigate?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const { pathname } = useLocation()
  const inApp = apps.some(app => pathname === app.href || pathname.startsWith(`${app.href}/`))
  return <nav className="space-y-2" aria-label="Main navigation">
    <NavLink to="/apps" end title={collapsed ? 'Dashboard' : undefined} onClick={onNavigate} className={({ isActive }) => `side-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0!' : ''}`}><LayoutGrid size={19} /><span className={collapsed ? 'sr-only' : ''}>Dashboard</span></NavLink>
    <Collapsible open={expanded} onOpenChange={setExpanded} className="relative" onPointerEnter={event => { if (event.pointerType === 'mouse') setExpanded(true) }} onPointerLeave={event => { if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) setExpanded(false) }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false) }} onKeyDown={event => { if (event.key === 'Escape') setExpanded(false) }}>
      <CollapsibleTrigger render={<Button variant="ghost" className={`side-link w-full justify-start ${inApp ? 'active' : ''} ${collapsed ? 'justify-center! px-0!' : ''}`} aria-label="Apps" title={collapsed ? 'Apps' : undefined} />}><Layers size={19} /><span className={collapsed ? 'sr-only' : 'flex-1 text-left'}>Apps</span>{!collapsed && <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />}</CollapsibleTrigger>
      <CollapsibleContent className={collapsed ? 'absolute top-0 left-full z-40 w-60 rounded-2xl border bg-popover p-2 shadow-xl' : 'ml-5 space-y-1 border-l pt-2 pl-3'}>{apps.map(app => <NavLink key={app.id} to={app.href} onClick={() => { setExpanded(false); onNavigate?.() }} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><app.icon size={17} /><span>{app.name}</span></NavLink>)}</CollapsibleContent>
    </Collapsible>
    <NavLink to="/settings" title={collapsed ? 'Settings' : undefined} onClick={onNavigate} className={({ isActive }) => `side-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0!' : ''}`}><Settings2 size={19} /><span className={collapsed ? 'sr-only' : ''}>Settings</span></NavLink>
  </nav>
}
