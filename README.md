# Blue app

A mobile-first personal workspace with an extensible sub-app dashboard and a private Log app. Built with Bun, React Router 7 SPA routing, Vite, React, strict TypeScript, Tailwind CSS v4, shadcn Base UI Nova, CSS variables, Lucide, Convex Auth, Zustand, next-themes, and shadcn Sonner.

## Run

```powershell
blue-app
```

This globally registered Bun command works from any directory. It installs locked dependencies, syncs the personal Convex development deployment, runs strict typechecking, preserves existing auth signing keys, and starts Convex watch plus Vite at http://localhost:5173. Ctrl+C stops both servers. Open a new Codex terminal if Bun is not on PATH yet, or run:

```powershell
& "$env:USERPROFILE\.bun\bin\blue-app.exe"
```

The global link points at this workspace. Run `bun link` again if you move it.

## Website and app routes

- `/`: public Cameron Blue homepage with a top-bar sign-in link.
- `/apps`: private dashboard after sign-in.
- `/log` and `/log/data`: private Log sub-app.
- `/settings`: private account and admin settings.

## Accounts

The initial admin account is **Cameron_Blue**, with the initial password supplied by the owner during setup. The password is not saved in source or documentation. Convex Auth stores a password hash. The temporary bootstrap environment variables were removed after creation.

- Sign in with a username and password. Usernames are case insensitive, with 3–32 letters, numbers, or underscores.
- Settings lets each person change their username and password using their current password.
- Password changes invalidate all sessions; sign in again afterward.
- Admins can add member accounts in Settings → People. Public sign-up is disabled on the backend.
- Each account has private events and logs. Admin status permits account creation, not access to another person's logs.
- Account provisioning is implemented with Convex Auth's account APIs, not a separate auth backend.

## Log app

- Log is a nested sub-app at `/log`, with Events and Data (`/log/data`) tabs. Data is not part of the global navigation; old `/data` links redirect into Log.
- Create named, color-coded events with optional descriptions.
- Tap **Log it** to persist the captured tap time immediately. Add an optional note afterward.
- Optional **Log location** is configured in each event create/edit form and defaults off. When enabled for that event, logging requests browser location permission and saves latitude, longitude, accuracy, and capture time privately with the entry. Permission denial, timeout, or an unsupported browser leaves the event saved without location. Location capture requires HTTPS or localhost. No background tracking is used.
- Saved coordinates appear in the timeline and CSV export. The setting is saved with the event across devices. Existing events default off; archiving preserves the setting.
- Edit event details, archive/restore events, edit notes, or delete individual entries with confirmation.
- Empty events can be deleted. Events with history can be archived to preserve that history.
- Data includes event/date filters, exact all-time totals, recent-period counts, active days, latest occurrence, a weekly activity chart, and paginated history.
- Charts, period overview, active days, and CSV export use up to the latest 1,000 matching entries. A visible notice appears when truncated. Narrow filters for a complete overview. All-time totals and paginated history remain complete.
- Timestamps display in your device's local time; CSV timestamps use ISO UTC.
- Up to 200 event definitions per account. People displays up to 100 accounts per role.

## Project commands

```sh
bun run dev          # same installation/setup + Convex + Vite flow
bun run setup        # install, sync, typecheck, and initialize missing auth keys
bun run dev:frontend # frontend only
bun run typecheck
bun run lint
bun run test         # isolated Convex behavior/authorization tests
bun run test:e2e     # live browser test; credentials required below
bun run build
bun run preview
```

The browser test requires locally installed Chrome, the app running on port 5173, and `BLUE_E2E_USERNAME` / `BLUE_E2E_PASSWORD` environment variables set to a development admin account. It creates a temporary event, verifies persistence and notes, and removes the entry/event on success. It also checks settings, themes, CSV export, browser errors, and mobile/desktop horizontal overflow. It skips when credentials are not set. Screenshots are saved to `artifacts/`. Do not run it against production data.

Convex's built-in compiler subprocess cannot invoke the native TypeScript 7 compiler through Bun on Windows. The launcher explicitly runs `bun run typecheck` after the initial sync; use that command or `bun run build` to typecheck subsequent changes.

## Extend the workspace

- Add sub-app metadata to `src/lib/apps.ts` and its lazy route in `src/router.tsx`.
- Implement pages under `src/pages/`; use generated shadcn Base UI components for controls.
- Add persisted domain data and authorized functions under `convex/`. Never mirror query results into Zustand or add another API backend.
- `convex/lib/access.ts` derives identity server-side; every domain read/write checks ownership.
- `src/stores/ui.ts` is reserved for ephemeral UI interaction state.
- Official Convex AI skills are installed in `.agents/skills`; see `AGENTS.md` and generated Convex guidance.

## Deployment

Connected to personal team `cameron-blue`, project `blue-app`, development deployment `elated-chinchilla-392`. `.env.local` is ignored and must not be committed. Cloudflare Workers configuration is prepared for `blue-app` and `cameronblue.org`; see [CLOUDFLARE.md](./CLOUDFLARE.md) for build settings and production initialization. Production auth, the admin account, and hosting must be initialized separately from development.
