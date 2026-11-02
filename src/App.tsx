import { useState } from 'react'
import { Navigate, NavLink, Outlet, Link, useLocation, useRouteError } from 'react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { ArrowRight, ArrowUpRight, LayoutGrid, ListPlus, ChartNoAxesCombined, Settings2, LogOut, Layers, ShieldCheck, Sparkles, Gamepad2 } from 'lucide-react'
import { api } from '@/lib/backend'
import { apps } from '@/lib/apps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

const navigation = [
  { to: '/apps', label: 'Dashboard', short: 'Home', icon: LayoutGrid },
  { to: '/log', label: 'Log app', short: 'Log', icon: ListPlus },
  { to: '/games', label: 'Games', short: 'Games', icon: Gamepad2 },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings2 },
]
export function RootLayout() { return <><Outlet /><Toaster position="top-center" richColors /></> }
export function Loading() { return <div className="space-y-4 p-6" role="status" aria-label="Loading"><Skeleton className="h-8 w-40" /><Skeleton className="h-44 w-full rounded-2xl" /><Skeleton className="h-20 w-full rounded-2xl" /></div> }
export function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  if (isLoading) return <Loading />
  return isAuthenticated ? <Shell /> : <Navigate to="/sign-in" replace />
}
function Shell() {
  const me = useQuery(api.accounts.me)
  const location = useLocation()
  const { signOut } = useAuthActions()
  if (me === undefined) return <Loading />
  if (!me) return <div className="grid min-h-svh place-items-center p-6"><div className="panel max-w-sm space-y-4 p-8"><h1 className="text-xl font-semibold">Use your Blue account</h1><p className="text-muted-foreground">Sign out of the starter session, then use the username your administrator created.</p><Button onClick={() => void signOut()}>Go to sign in</Button></div></div>
  const active = navigation.find(n => n.to === location.pathname || (n.to !== '/' && location.pathname.startsWith(`${n.to}/`)))
  return <div className="app-shell">
    <aside className="desktop-sidebar">
      <Brand to="/apps" />
      <p className="mb-3 mt-12 px-3 text-[10px] font-semibold tracking-[.18em] text-muted-foreground">YOUR WORKSPACE</p>
      <nav className="space-y-1.5" aria-label="Main navigation">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/apps'} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={19} />{label}</NavLink>)}</nav>
      <div className="mt-auto rounded-2xl border border-dashed p-4"><Sparkles size={19} className="mb-3 text-primary" /><p className="text-sm font-medium">A little more you.</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Your apps. Your tools.<br />Room for what comes next.</p></div>
      <div className="mt-5 flex items-center gap-3 border-t pt-5"><div className="avatar">{me.username.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{me.username}</p><p className="text-xs capitalize text-muted-foreground">{me.role}</p></div><Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut().catch(() => toast.error('Could not sign out.'))}><LogOut size={17} /></Button></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="app-header"><div className="md:hidden"><Brand to="/apps" /></div><div className="hidden text-sm text-muted-foreground md:block">Workspace <span className="mx-3 text-border">/</span><span className="text-foreground">{active?.label ?? 'Blue app'}</span></div><div className="flex items-center gap-3"><span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-emerald-500" />Personal workspace</span><Link to="/settings" className="avatar size-9 text-xs" aria-label="Account settings">{me.username.slice(0, 2).toUpperCase()}</Link></div></header>
      <main className="main-content"><Outlet /></main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(({ to, short, icon: Icon }) => <NavLink key={to} to={to} end={to === '/apps'} className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}><Icon size={21} strokeWidth={1.8} /><span>{short}</span></NavLink>)}</nav>
  </div>
}
function Brand({ to = '/' }: { to?: string }) { return <Link to={to} className="flex items-center gap-2.5"><span className="brand-icon"><Layers size={21} strokeWidth={2.2} /></span><span className="text-xl font-bold tracking-tight">blue<span className="text-primary">.</span></span></Link> }
export function SignIn() {
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  if (isLoading) return <Loading />
  if (isAuthenticated) return <Navigate to="/apps" replace />
  return <div className="login-page"><div className="login-story"><Brand /><div className="my-auto max-w-md"><p className="eyebrow text-blue-200">A SPACE THAT GROWS WITH YOU</p><h1 className="mt-5 text-5xl leading-[1.12] font-semibold tracking-tight">Life happens.<br />Make a little<br /><span className="text-blue-200">sense of it.</span></h1><p className="mt-6 max-w-xs text-base leading-relaxed text-blue-100/80">A personal home for your everyday tools, small observations, and everything you’re curious about.</p><div className="mt-10 flex gap-3"><span className="login-mini"><ListPlus size={19} />Log the moment</span><span className="login-mini"><ChartNoAxesCombined size={19} />Find a pattern</span></div></div><p className="text-xs text-blue-100/60">A little more organized. A little more you.</p></div>
    <div className="flex min-h-svh flex-col justify-center p-6 sm:p-12"><div className="mx-auto w-full max-w-sm"><div className="mb-16 md:hidden"><Brand /></div><Badge variant="secondary" className="mb-5 gap-1.5"><ShieldCheck size={13} />Your personal workspace</Badge><h2 className="text-3xl font-semibold tracking-tight">Welcome back.</h2><p className="mt-3 mb-9 text-sm text-muted-foreground">Sign in to pick up where you left off.</p>
    <form className="space-y-5" onSubmit={async e => { e.preventDefault(); if (pending) return; setPending(true); setError(''); const data = new FormData(e.currentTarget); try { await signIn('password', { username: String(data.get('username')), password: String(data.get('password')), flow: 'signIn' }) } catch { setError('The username or password is incorrect. Please try again.') } finally { setPending(false) } }}>
      <div className="space-y-2"><Label htmlFor="username">Username</Label><Input className="h-12" id="username" name="username" placeholder="Your username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={32} disabled={pending} /></div>
      <div className="space-y-2"><Label htmlFor="password">Password</Label><Input className="h-12" id="password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required maxLength={128} disabled={pending} /></div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button className="h-12 w-full" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}<ArrowRight size={17} /></Button>
    </form><p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">Need an account? Ask your administrator<br />to add you to Blue.</p></div></div></div>
}
export function Dashboard() {
  const me = useQuery(api.accounts.me)
  const events = useQuery(api.logbook.listEvents)
  if (!me || !events) return <Loading />
  const count = events.reduce((sum, event) => sum + event.totalCount, 0)
  return <div className="space-y-8"><div><p className="eyebrow">YOUR PERSONAL SPACE</p><h1 className="page-title">Hey, {me.username.split('_')[0]}. <span className="font-normal">✦</span></h1><p className="page-subtitle">A home for your tools. A little clarity for your day.</p></div>
    <section className="dashboard-hero"><div className="relative z-10 max-w-md"><span className="hero-label"><span className="size-1.5 rounded-full bg-blue-200" />SMALL MOMENTS, BIGGER PICTURE</span><h2 className="mt-5 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">Notice more.<br />Remember the little things.</h2><p className="mt-4 max-w-xs text-sm leading-relaxed text-blue-100">Capture what happens around you and discover the patterns in your everyday.</p><Button className="mt-7 h-11 bg-white text-blue-800 hover:bg-blue-50" render={<Link to="/log" />}>Open Log app<ArrowUpRight size={17} /></Button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-tile art-tile-one"><ListPlus size={32} /></div><div className="art-tile art-tile-two"><ChartNoAxesCombined size={27} /></div><div className="art-dot" /></div></section>
    <section><div className="mb-4 flex items-center justify-between"><h2 className="section-title">Your apps</h2><span className="text-xs text-muted-foreground">{apps.length} {apps.length === 1 ? 'app' : 'apps'} · room to grow</span></div><div className="grid gap-4 sm:grid-cols-2"><>{apps.map(app => <Link key={app.id} to={app.href} className="panel app-card group"><div className="flex items-start justify-between"><span className="app-icon"><app.icon size={25} /></span><ArrowUpRight className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={19} /></div><div className="mt-6 flex items-center gap-2"><h3 className="font-semibold">{app.name}</h3><Badge variant="secondary" className="text-[10px]">{app.access === 'public' ? 'PUBLIC' : 'PERSONAL'}</Badge></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{app.description}</p>{app.id === 'log' ? <div className="mt-7 flex gap-5 border-t pt-4 text-xs text-muted-foreground"><span><strong className="text-foreground">{events.filter(e => !e.archived).length}</strong> events</span><span><strong className="text-foreground">{count.toLocaleString()}</strong> moments logged</span></div> : <div className="mt-7 flex gap-5 border-t pt-4 text-xs text-muted-foreground"><span>Flick Basketball</span><span>More games to come</span></div>}</Link>)}</><div className="future-app"><span className="mb-4 grid size-11 place-items-center rounded-xl border border-dashed"><Layers size={21} /></span><h3 className="text-sm font-medium text-foreground">Whatever comes next.</h3><p className="mt-2 max-w-56 text-center text-xs leading-relaxed">This space grows with you. New tools will find their home right here.</p></div></div></section>
    <div className="flex items-center gap-3 text-xs text-muted-foreground"><ShieldCheck size={16} /><p>Your logs stay in your account. Your curiosity stays yours.</p></div>
  </div>
}
export function RouteError() {
  useRouteError()
  return <div className="mx-auto max-w-md p-8"><h1 className="page-title">Something went wrong.</h1><p className="page-subtitle">Try reloading to reconnect to your workspace.</p><Button className="mt-5" onClick={() => window.location.reload()}>Reload</Button></div>
}
export function NotFound() { return <div><h1 className="page-title">Page not found</h1><Button className="mt-6" render={<Link to="/apps" />}>Back to your dashboard</Button></div> }
