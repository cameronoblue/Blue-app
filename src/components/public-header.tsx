import { Link, NavLink, useLocation } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PublicHeader() {
  const pathname = useLocation().pathname
  const inPublicApp = pathname.startsWith('/basketball') || pathname === '/games'
  return <header className="public-header">
    <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label="Cameron Blue home"><span className="public-monogram">cb.</span><span className="hidden sm:inline">cameronblue.org</span></Link>
    <nav aria-label="Public navigation" className="flex items-center gap-3 sm:gap-6">
      <NavLink to="/public-apps" aria-current={inPublicApp ? 'page' : undefined} className={({ isActive }) => `inline-flex min-h-11 items-center text-sm font-medium ${isActive || inPublicApp ? 'text-blue-600' : 'text-muted-foreground hover:text-blue-600'}`}>Public apps</NavLink>
      <a href="/#reviews" className="hidden text-sm text-muted-foreground hover:text-blue-600 min-[380px]:inline">Reviews</a>
      <Button className="h-11 gap-2 rounded-full bg-[#315dd0] px-4 text-white hover:bg-[#2449ab] sm:px-5" render={<Link to="/sign-in" />}>Sign in<ArrowUpRight size={16} /></Button>
    </nav>
  </header>
}
