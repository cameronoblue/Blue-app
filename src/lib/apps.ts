import { ListPlus, CircleDot } from 'lucide-react'

// Add future sub-apps here and register their lazy routes in src/router.tsx.
// Domain data stays in Convex; this catalog is static navigation metadata.
export const apps = [{
  id: 'log', access: 'private', name: 'Log app', href: '/log', icon: ListPlus,
  description: 'A quick place for things you do, things you notice, and patterns worth finding.',
}, {
  id: 'basketball', access: 'public', name: 'Flick Basketball', href: '/basketball', icon: CircleDot,
  description: 'Flick, swish, repeat. Chase a moving hoop, build your streak, and beat the clock.',
}]
