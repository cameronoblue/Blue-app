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

## Guest reviews

The public homepage includes a Reviews section. Visitors can submit a 1-5 star rating, optional display name (defaults to Anonymous), and a 10-1,000 character comment without signing in or creating an account. Names are unverified and reviews publish immediately. Rendering treats review content as plain text.

Settings includes admin-only Guest reviews controls to hide and restore submissions. Hidden reviews are excluded by the public query; browser/request identifiers are never returned by public queries. Existing private app data still requires authentication and ownership checks.

Convex's rate-limiter component enforces one submission per hour per browser key and global token-bucket budgets of 10 per minute and 100 per day. A honeypot and idempotency keys deter basic bots and duplicate retries. Browser keys are a basic abuse deterrent, not verified identities; they can be reset by clearing storage. There is no CAPTCHA integration.

The guest browser test runs against development with synthetic review text and hides the test submission afterward. Backend tests cover guest submission, bounds, retry deduplication, limits, and admin-only hide/restore access.

## Flick Basketball

Open Public apps at `/public-apps`, then play Flick Basketball at `/basketball`. No account or sign-in is required. The signed-in dashboard also links to the public game. Flick upward starting on the ball: sideways angle changes direction, and distance/speed determine power. Aim ahead of the moving hoop. The court includes a short dotted aim guide, rim rebounds, and an optional focus mode. Rapid-fire shots are supported: a fresh ball is ready after 0.1 seconds, and earlier balls continue flying and scoring independently.

- Start with 60 seconds. Score milestones are 10, 25, 45, 70, 100 points, then continue with progressively larger gaps. Each milestone adds 10 seconds.
- Each basket starts at 2 points. Makes 1-3 award 2 each, 4-6 award 4 each, 7-9 award 6 each, 10-12 award 8 each, and 13 onward award 10 each. A miss resets the streak.
- The hoop starts slowly and accelerates with successful baskets and active play time.
- Vibration patterns become longer and repeat with stronger streaks, only on supported browsers/hardware. Unsupported browsers retain all game mechanics and visual feedback.
- Pause/resume manually, or automatically pause when the tab is hidden or the window loses focus. Keyboard support: left/right aim, up/down power, Space shoots, Escape pauses.
- Guest runs remain temporary and can be replayed immediately. Signed-in completed runs are saved privately in Convex, with best score and the most recent score. Game physics and in-progress state are ephemeral client state. These are personal client-reported scores, not a competitive/verified leaderboard.
- Physics and scoring use fixed time steps. Timer expiration ends the run immediately; shots crossing after the buzzer do not score. Finish this run on the pause screen ends and saves early.
- Tests cover actual shot simulation, moving-hoop crossing, misses, bonus thresholds, streak rewards, timer/pause/buzzer, haptic patterns, private score storage, and browser play-through.

## Polls & quizzes

Admins open `/polls` from the dashboard to create a draft with 1–20 questions. Each question is multiple choice (2–12 options) or open ended (up to 300 characters). Selecting a correct choice enables quiz grading for that question. Drafts can be edited; questions lock on publication to preserve response meaning.

Publishing activates a random eight-character code and a QR pointing directly to `/join/CODE`. `/join` is listed in Public apps and accepts codes without an account. Guest session capabilities are generated with browser crypto and stored locally per poll; only the token is stored, never a copy of Convex response data. A session submits each question once, retries are idempotent, and returning with the token restores progress. Clearing browser storage creates a new session, so this is not identity-verified voting.

Hosts can close/reopen voting, reveal/hide participant results, hide their local presentation view separately, and present without the workspace chrome. Result hiding is enforced in Convex: public aggregate queries return null and quiz scores are withheld. Public question data never includes answer keys, owner IDs, or participant tokens. Owning admins can inspect results privately while participant results stay hidden.

Multiple-choice results support live bar, pie, donut, and table views. Open-ended results support a frequency-based word cloud (top 60 words, common English words omitted), answer cards, and a table. CSV exports cover the selected question. Open-ended answers can be hidden/restored by the owning admin; hidden text is excluded from public results and exports.

Each session supports 1,000 participants, with a per-session join token bucket of 120 per minute. All response reads are indexed and bounded to that session limit. The host list shows the newest 100 sessions. Anonymous participation is an intentional public data exception; private logs and account data stay protected. Poll content and responses persist in Convex, while editor drafts and presentation controls are temporary client state.

The public header has light/dark/system theme controls. The homepage, reason cards, review form and review cards follow the same next-themes preference as Settings.
