import { defineApp } from 'convex/server'
import { v } from 'convex/values'

export default defineApp({ env: {
  BOOTSTRAP_USERNAME: v.optional(v.string()),
  BOOTSTRAP_PASSWORD: v.optional(v.string()),
} })
