import { defineApp } from 'convex/server'
import { v } from 'convex/values'
import rateLimiter from '@convex-dev/rate-limiter/convex.config.js'

const app = defineApp({ env: {
  BOOTSTRAP_USERNAME: v.optional(v.string()),
  BOOTSTRAP_PASSWORD: v.optional(v.string()),
} })
app.use(rateLimiter)
export default app
