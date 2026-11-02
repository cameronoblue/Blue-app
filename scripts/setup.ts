import { capture, run } from './process'

export async function setup() {
  await run(['install', '--frozen-lockfile'])
  // First use asks for login/team/project. Choose your personal team and cloud dev.
  await run(['x', '--bun', 'convex', 'dev', '--once', '--typecheck', 'disable'])
  // Run TypeScript through Bun's script runner (Convex's subprocess check cannot
  // launch TypeScript 7's native compiler through Bun on Windows).
  await run(['run', 'typecheck'])

  // Inspect names only; never fetch or replace existing secrets.
  const names = (await capture(['x', '--bun', 'convex', 'env', 'list', '--names-only'])).split(/\r?\n/).map((name) => name.trim())
  const privateKey = names.includes('JWT_PRIVATE_KEY')
  const jwks = names.includes('JWKS')
  if (Boolean(privateKey) !== Boolean(jwks)) {
    throw new Error('Convex Auth has only one signing variable configured. Restore the matching JWT_PRIVATE_KEY/JWKS pair in the Convex dashboard before continuing.')
  }
  if (!privateKey && !jwks) {
    const keys = await crypto.subtle.generateKey({
      name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256',
    }, true, ['sign', 'verify'])
    const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', keys.privateKey)).toString('base64')
    const pem = `-----BEGIN PRIVATE KEY----- ${pkcs8.match(/.{1,64}/g)!.join(' ')} -----END PRIVATE KEY-----`
    const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey)
    // Submit the pair together over stdin to keep secrets out of process arguments.
    await capture(['x', '--bun', 'convex', 'env', 'set'], `JWT_PRIVATE_KEY="${pem}"\nJWKS='${JSON.stringify({ keys: [{ use: 'sig', ...publicKey }] })}'\n`)
    console.log('Configured Convex Auth signing keys.')
  }
  console.log('Framework setup complete.')
}

if (import.meta.main) await setup()
