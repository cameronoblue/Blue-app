import { fileURLToPath } from 'node:url'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))

export async function run(args: string[]) {
  const child = Bun.spawn([process.execPath, ...args], {
    cwd: projectRoot, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit',
  })
  const code = await child.exited
  if (code !== 0) throw new Error(`Command failed (${code}): bun ${args.join(' ')}`)
}

export async function capture(args: string[], input?: string) {
  const child = Bun.spawn([process.execPath, ...args], {
    cwd: projectRoot, stdin: input === undefined ? 'ignore' : new TextEncoder().encode(input), stdout: 'pipe', stderr: 'pipe',
  })
  const [output, error, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ])
  if (code !== 0) throw new Error(`Convex command failed: ${error}`)
  return output.trim()
}
