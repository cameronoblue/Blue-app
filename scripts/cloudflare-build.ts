import { run } from './process'

// Pass --cmd as one argument on every platform, without shell quote parsing.
await run([
  '--bun', './node_modules/convex/bin/main.js', 'deploy',
  '--typecheck', 'disable',
  '--cmd', 'bun run build',
  '--cmd-url-env-var-name', 'VITE_CONVEX_URL',
  ...process.argv.slice(2),
])
