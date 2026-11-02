#!/usr/bin/env bun
// Bun's global link resolves this file from anywhere; all work runs in this project.
if (process.argv.includes('--help')) {
  console.log('blue-app: Install locked dependencies, configure Convex/Auth if needed, and run Convex + Vite from any directory. First use requires Convex login and your personal team selection.')
} else {
  await import('./start')
}
