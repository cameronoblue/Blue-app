import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { router } from './router'
import './index.css'

const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) throw new Error('Missing VITE_CONVEX_URL. Run bun run setup to connect Convex.')
const convex = new ConvexReactClient(convexUrl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ConvexAuthProvider client={convex}>
        <TooltipProvider><RouterProvider router={router} /></TooltipProvider>
      </ConvexAuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
