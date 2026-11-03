import { ListPlus, Gamepad2, BarChart3 } from 'lucide-react'

// Add future sub-apps here and register their lazy routes in src/router.tsx.
// Domain data stays in Convex; this catalog is static navigation metadata.
export const apps = [{
  id: 'log', access: 'private', name: 'Log app', href: '/log', icon: ListPlus,
  description: 'A quick place for things you do, things you notice, and patterns worth finding.',
}, {
  id: 'games', access: 'public', name: 'Games', href: '/games', icon: Gamepad2,
  description: 'Your arcade inside Blue. Play Flick Basketball and find new games as they arrive.',
}, {
  id: 'polls', access: 'private', name: 'Polls & quizzes', href: '/polls', icon: BarChart3,
  description: 'Bring everyone into the conversation with live polls, quizzes, and a code to join.',
}]
