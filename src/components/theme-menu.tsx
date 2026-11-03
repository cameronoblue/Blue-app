import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function ThemeMenu() {
  const { theme, setTheme } = useTheme()
  return <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-11" aria-label="Change theme" />}><Sun className="size-4 dark:hidden" /><Moon className="hidden size-4 dark:block" /></DropdownMenuTrigger><DropdownMenuContent align="end">{[{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Monitor }].map(({ value, label, icon: Icon }) => <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="min-h-10"><Icon size={15} />{label}{theme === value && <Check className="ml-auto" size={14} />}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
}
