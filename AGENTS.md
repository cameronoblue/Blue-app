# Framework baseline

- Use Bun, bunx, and bun run consistently.
- React Router 7 in SPA mode with Vite; do not add Next.js or server routes.
- TypeScript strict mode must remain enabled.
- Use shadcn Base UI components, base-nova style, CSS variable theming, and Lucide icons. Do not install Radix primitives.
- Use the generated shadcn Sonner component for notifications.
- next-themes uses class switching and system default.
- Convex owns all persistent domain data, queries, mutations, and authentication.
- Authorize domain functions on the server with Convex Auth. UI visibility alone is not authorization.
- Zustand stores ephemeral UI interaction state only. Never mirror Convex query data.
- Keep this framework-only until product requirements are supplied.
- Validate changes with bun run typecheck, bun run lint, and bun run build.
- Auth currently uses Convex Auth Password. Email delivery, verification, and password recovery require a separately configured provider before public release.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Product requirements now implemented

- Blue is a mobile-first personal workspace with an extensible dashboard.
- Username sign-in uses Convex Auth; public signup is disabled server-side.
- The initial owner is an admin. Admins can create member accounts, but cannot inspect their private logs.
- Users can change username/password in Settings, verified with the current password.
- Event definitions and timestamped entries belong to their authenticated owner.
- Log entries persist at tap time before optional notes are added.
- Preserve history when archiving; only empty events can be deleted.
- Keep charts/exports bounded and disclose truncated data. All-time event counters stay exact.
- Add new sub-apps through src/lib/apps.ts plus lazy routes, with domain functions in Convex.
- Validate with bun run typecheck, bun run lint, bun run test, and bun run build. For interaction changes, use the browser test against dev.

- Log is a nested sub-app at /log; Data belongs at /log/data, outside global navigation.
- Location logging is a per-event opt-in stored in Convex and editable in the create/edit form. Existing events default off. Persist the timestamp before requesting location; denied/unavailable location must not discard an entry. Location data is owner-only.

- The root / is a public Cameron Blue homepage. The private dashboard is /apps; sign-in redirects there. Keep all domain data behind authenticated routes and server authorization.

- Guest reviews are an intentional public data exception: anonymous read/submit is allowed for reviews only, with server validation, rate limits, and no private identity fields in public responses. Only admins may hide/restore reviews. Other domain data remains private.

- Basketball is a public /basketball game listed under /public-apps, with no required sign-in. Guest game state is temporary; only authenticated users save scores. Frame-by-frame physics is ephemeral client state; completed runs and personal bests are stored only in Convex. Keep moving-rim scoring downward-only, timer bonuses milestone-based, and vibration optional/feature-detected. Pause on tab/window backgrounding.

- Polls & quizzes is a dashboard app at /polls. Only owning admins may create/edit drafts, publish/close/reopen sessions, reveal/hide results, or moderate text. Guests join via public /join or /join/:code, without accounts; public question data excludes answer keys. Hidden results and quiz grades must be withheld by Convex, not only hidden in the UI. Questions lock after publication. Anonymous browser session tokens allow one answer per question with idempotent retries; this is not verified voting. Bound sessions to 1,000 participants and 20 questions, and keep guest tokens out of public results. Open-ended moderation excludes hidden text from charts, word clouds, and exports.
- The homepage follows light/dark/system through next-themes, including reviews and form controls. Public theme changes share the existing Settings preference.
- New polls default to host-led mode, with lobby → question → locked/results → next question → finished. The owning admin alone advances phases. Keep existing self-paced polls compatible via optional fields. Guests must receive only the active question; reject future and late submissions server-side. Audience /present/:code has no host controls and must honor public results visibility even for a signed-in admin. Sync its result format from Convex. Multi-answer quiz credit requires the exact selected set; final quiz totals cover only revealed questions.
- Workspace sidebar can collapse to icons. Group Log, Games, and Polls & quizzes under an Apps disclosure with mouse hover, keyboard, and tap support; mobile navigation uses a Sheet. Keep all navigation state ephemeral.

- Question types are Multiple choice (one selection), Checkboxes (multiple selections), and Open ended. Allow multiple submissions is an independent option on every type; default off. Preserve legacy allowMultiple selection behavior. Repeated submissions append rows and count in all results; require UUID request IDs and deduplicate retries. Limit to 20 submissions per participant/question and 5,000 per question. Completion and host answered counts use distinct questions/participants; quiz credit uses the latest submission per question. Keep hosted phase and visibility enforcement on every new submission.
