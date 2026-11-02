import { setup } from './setup'
import { projectRoot } from './process'

await setup()
const children = [
  Bun.spawn([process.execPath, 'x', '--bun', 'convex', 'dev', '--typecheck', 'disable'], {
    cwd: projectRoot, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit',
  }),
  Bun.spawn([process.execPath, 'run', 'dev:frontend'], {
    cwd: projectRoot, stdin: 'ignore', stdout: 'inherit', stderr: 'inherit',
  }),
]
const stop = () => children.forEach((child) => child.kill())
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
try {
  process.exitCode = await Promise.race(children.map((child) => child.exited))
} finally {
  stop()
  await Promise.all(children.map((child) => child.exited))
  process.off('SIGINT', stop)
  process.off('SIGTERM', stop)
}
