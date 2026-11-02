# Cloudflare deployment

Worker: `blue-app`. Custom domain: `cameronblue.org`.

The repository serves the static Vite output from `dist` with SPA fallback routing. Convex remains the backend. No extra Worker API server is needed.

## Cloudflare build settings

Open Workers & Pages → blue-app → Settings → Build.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | repository root |
| Build command | `bun run build:cloudflare` |
| Deploy command | `bun run deploy:cloudflare` |
| Build environment secret | `CONVEX_DEPLOY_KEY`: a **production** deploy key from this Convex project |

Add the key to **build** environment variables/secrets, not only Worker runtime bindings. Never commit it or put it in a `VITE_` variable. The build command deploys the backend associated with the key and passes its URL into the Vite build as `VITE_CONVEX_URL`. No manual frontend URL variable is required for this combined build.

Keep automatic builds for non-production branches disabled until separate preview backend credentials are configured. Do not use the production deploy key for preview builds.

## First production launch

1. Configure the production deployment in the existing `cameron-blue/blue-app` Convex project and create its production deploy key.
2. Configure Cloudflare's build settings above.
3. Before publishing the GitHub changes, verify that this is the intended production backend. A push to the connected production branch can automatically deploy both backend and frontend.
4. Deploy the functions, initialize Convex Auth signing keys **on production**, and provision the initial administrator **on production**. These are separate from local development. The existing local setup script targets development and must not be used to initialize production by accident. Production operations require an explicit target and confirmation when performed by an agent.
5. Remove temporary bootstrap credentials after provisioning. Do not reset or reuse development signing keys.
6. Deploy Cloudflare and verify sign-in, account settings, event creation, location opt-in, and a direct refresh of `/log/data` over HTTPS.

`wrangler.jsonc` attaches the custom domain `cameronblue.org` at deployment. The domain must be an active zone in the Cloudflare account deploying the Worker. No domain or production deployment has been changed by preparing these files.

## Local checks

`bun run check:cloudflare` runs strict typechecking, builds the frontend, and performs a Wrangler dry run. It does not upload the site or deploy Convex. A local build uses the local development URL; use the combined Cloudflare build for production.

The deployment script invokes the locked Wrangler CLI through Bun directly to avoid its Windows subprocess launcher failing on workspace paths containing spaces. The build script passes Convex arguments as an array so the frontend build command remains one argument on Linux and Windows.

References: [Workers SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/), [Workers build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Convex deployment command](https://docs.convex.dev/cli/reference/deploy).
