# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package manager

Always use **pnpm**. Never use npm or yarn.

`package.json` pins `"packageManager": "pnpm@9.15.9"`. **Don't remove it.** Both lockfiles are `lockfileVersion: 9.0`; without the pin, corepack resolves a pnpm 12.x and mismatches them.

## Monorepo structure

```
anx/
├── admin-dashboard/   React 18 + Vite 5 + Tailwind v4 (web)
├── rider-app/         Expo SDK 54 React Native (mobile)
└── backend/           Node.js + Express API
```

`admin-dashboard` and `backend` are pnpm workspace packages (see `pnpm-workspace.yaml`). `rider-app` is a plain directory in the monorepo (not a workspace package, not a git submodule) with its own `package.json`/`pnpm-lock.yaml`; run its commands from inside `rider-app/`.

**Work on `dev`, not `main`.** `dev` is the active branch; `main` is the deploy target — merging to it ships both Vercel projects *and* auto-applies migrations.

`Build.md` is the original phase-by-phase build plan and locked product decisions (Abuja zone-based pricing, fixed rider pay, admin-created jobs, etc.) — read it for product intent, not current implementation state.

## Architecture

Both clients (admin + rider) share the same shape: they own a **Supabase JS client** and authenticate **directly against Supabase Auth** (`supabase.auth.signInWithPassword`), persisting the session client-side (browser storage / `AsyncStorage`). Every call to the Express backend goes through an axios instance whose request interceptor attaches the current `session.access_token` as a `Bearer` header (`lib/api.*`). The backend never issues tokens to the running clients — it only **verifies** them in `requireAuth`.

So there are effectively two auth surfaces, and this matters when debugging login:
- **Client login is a direct Supabase call, not `POST /api/auth/login`.** That backend endpoint exists and mirrors the same logic server-side, but the shipped clients don't use it for login. `POST /api/auth/register` (admin-only) *is* the only way to create users — it uses `supabase.auth.admin.createUser` + a `users` row, and rolls back the auth user if the profile insert fails.
- Reads/writes of domain data (jobs, zones, riders) go **client → Express → Supabase (service role)**. The backend bypasses RLS; the clients touching Supabase directly (rider Storage uploads) are the only place RLS is enforced.
- **Deactivation is a shared contract.** `requireAuth` answers `403 { error: 'Account deactivated' }` for any user with `is_active = false`, admins included. Both clients match on that **message string** (not the status — `requireAdmin` also returns 403) and sign out. Deactivated users can still *sign in*, because login never touches Express; they are blocked on their first API call.

**Job status lifecycle** is the core domain model, enforced in `backend/src/routes/jobs.js` *and* mirrored in RLS (migration `001`):

```
pending ──assign(admin)──▶ assigned ──picked_up(rider)──▶ picked_up ──▶ delivered (photo required)
                                                                    └──▶ failed    (reason required)
   │
   └── cancel(admin, reason) ──▶ cancelled   (allowed from any status except delivered/failed)
```

- Transitions are guarded by conditional `.update().eq('status', <expected>)` calls that return 409 if the row wasn't in the expected state (guards double-assignment / illegal jumps).
- Riders can only advance jobs **assigned to themselves** (`assigned_rider_id === req.user.id`), and only the `picked_up → delivered/failed` steps. `delivered` requires `delivery_photo_url`; `failed` requires `failure_reason`.
- `delivery_fee` is **derived server-side** from `zone_pricing` (pickup zone → dropoff zone) at job creation — never trust a client-supplied fee.
- Cash jobs: rider confirms collection via `PATCH /api/jobs/:id/payment` (sets `payment_status` + `cash_remitted`).

## Deployment & environments

Both web packages deploy to Vercel under the **ANX** team (`anx-500a12d4`), from this repo:

| Vercel project | Package | Notes |
|---|---|---|
| `anx-admin-dashboard` | `admin-dashboard/` | live at **www.anxlogistic.app** |
| `anx-backend` | `backend/` | Root Directory = `backend`, Express preset |

There is **no `vercel.json` or `.vercel/` in the repo** — Root Directory, env vars, and domains are all configured in the Vercel dashboard. You can't learn the deploy config by reading the tree.

**Two Supabase projects share one schema:**

| Project | Ref | Role |
|---|---|---|
| `rider-app` | `csqwqrujunejbyjbqgxc` | **production** — note the misleading name; nothing is called "prod" |
| `anx-dev` | `yzkebxfcffpqizxrxffv` | dev, same migrations applied, no real data |

**Open gap — no env convention exists yet.** All three local `.env` files currently point at the **production** ref, and `.env.example` only has placeholders, so a local dev session reads and writes production by default. If you're doing anything destructive locally, repoint at `anx-dev` first and check with the user before assuming which project an env should target.

## Commands

### Root
```bash
pnpm dev:admin      # start admin-dashboard dev server
pnpm dev:backend    # start backend with nodemon
```

### admin-dashboard
```bash
pnpm --filter admin-dashboard dev
pnpm --filter admin-dashboard build
```

### backend
```bash
pnpm --filter backend dev     # nodemon, port 3000
pnpm --filter backend start   # node directly
```

### rider-app
```bash
cd rider-app
pnpm start          # expo start
pnpm run android
pnpm run ios
```

## Key details

### Testing & linting
There is **no test runner and no linter** configured in any package (no Jest/Vitest/ESLint). The only static check is TypeScript: `pnpm --filter admin-dashboard build` runs `tsc && vite build`, so a type error fails the admin build. The backend and rider-app are plain JS with no build/typecheck step. Don't invent a `pnpm test`/`pnpm lint` — they don't exist.

### admin-dashboard
- Tailwind v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed; configured entirely in `vite.config.ts`
- CSS entry: `src/index.css` with `@import "tailwindcss"`
- Env vars must be prefixed `VITE_` to be exposed to the browser. Needs `VITE_API_URL` (backend base URL) plus the Supabase URL/anon key for the client.
- Routing is `react-router-dom` in `src/App.tsx`; authed pages are wrapped in `ProtectedRoute` → `Layout`. `src/hooks/useAuth.tsx` (`AuthProvider`/`useAuth`) does the direct-Supabase login and loads the `users` profile. `src/lib/api.ts` redirects to `/login` on any `401`, and signs out first on a deactivation `403`. `Map`/`Payouts`/`Reconciliation` routes are `ComingSoon` placeholders.
- **Brand tokens live in `src/index.css` `@theme`** — use `bg-anx-navy` / `text-anx-orange` / `anx-orange-ink`, never raw hex. Navy `#0A1F44` takes primary fills; orange `#FF7A00` is accent only (active nav, focus rings) — **white on orange is 2.6:1 and fails WCAG AA**, so it can't carry a button label. `navy-700` and `orange-ink` are derived UI states, not brand colours. Font is Archivo at 400/500/600/800 (the middle weights are loaded because the codebase uses `font-medium`/`font-semibold` heavily).
- Job status badges deliberately keep green/red for delivered/failed; brand colours mark only the in-flight states. Don't "brand" the terminal ones — operators scan that column.
- Logos in `src/assets/brand/` (with the brand doc). **Import them as ES modules** so a bad path fails the build instead of rendering a broken image. Per the doc: full lockup min ~100px, icon min 24px, and always pair a fixed height with `w-auto` — never set both dimensions.
- All screens must be fully mobile responsive

### backend
- ESM (`"type": "module"`) — use `import`/`export`, not `require`
- `src/index.js` both calls `app.listen` (local dev via nodemon) and does `export default app` (Vercel's Express preset, Root Directory = `backend`). Keep both.
- Runs on port 3000 (`PORT` in `backend/.env`); health endpoint: `GET /health` → `{ status: 'ok' }`
- Uses the **service role key** (not anon key) for Supabase access — so backend queries **bypass RLS entirely**. RLS policies only matter for clients that talk to Supabase directly (e.g. the rider app's Storage uploads).
- Middleware order: helmet → cors → express.json → routes
- Auth model: no email — riders/admins log in with **phone + password**, mapped to a Supabase Auth email of `{phone}@logistics.app`. `POST /api/auth/login` returns `{ session, user }`. Protected routes use `requireAuth` (verifies the `Bearer` token, loads the `users` profile onto `req.user`); admin-only routes add `requireAdmin`.
- SQL lives in `backend/supabase/migrations/` (`001` schema + RLS, `002` seed zones/pricing, `003` storage policies, `004` rider deactivation, `005` deactivation RLS + `is_my_account_active()`). Migrations here **auto-apply to production on merge to `main`** via the Supabase–Vercel GitHub integration ("Deploy to production" enabled). Don't hand-apply a migration that's already merged — you'll run it twice.
  - **The migration table is not a reliable record of production.** Production only tracks `005`; `001`–`004` were applied by hand in the SQL Editor before the integration existed and were never recorded. `anx-dev` tracks all five. Verify against the actual schema (`pg_policies`, `pg_proc`), not the migration list.
- Delivery photos: Supabase Storage bucket `delivery-photos` (public-read, no size/mime limits). Riders upload directly from the app, so uploads require the Storage INSERT policy in migration `003`. **Never use `upsert: true` on these uploads** — Storage upserts require an UPDATE policy on `storage.objects` (even for brand-new paths), and only an INSERT policy exists, so upserts fail with an RLS violation.
- There is **no separate riders table** — riders and admins are both rows in `users`, split by `role`. Rider deactivation is `users.is_active` (migration `004`): inactive riders keep all job/photo/payout history but are excluded from the assign-rider picker and rejected by `PATCH /api/jobs/:id/assign`. They can still obtain a session, but `requireAuth` rejects every protected route with `403 Account deactivated`, and migration `005` adds the same check to the rider job-UPDATE and delivery-photo Storage policies so a stale token can't bypass Express.
- Rider management endpoints (admin-only): `GET /api/riders` (returns `is_active`, `active_jobs`, `total_jobs`), `PATCH /api/riders/:id/active` (deactivate/reactivate), `DELETE /api/riders/:id` (hard delete, **gated: 409 unless the rider has zero jobs of any status** — deactivation is the only option for riders with history; also removes the Supabase Auth account).

### rider-app
- Env vars must be prefixed `EXPO_PUBLIC_` — Expo auto-loads them from `.env` into `process.env` (no manual loader). `.env` is gitignored; copy `.env.example` to `.env` and fill in values.
- `EXPO_PUBLIC_API_URL` must be a **reachable `http://<host>:3000` URL** for the backend. On a physical device use the machine's LAN/Tailscale IP (not `localhost` or `0.0.0.0`, which won't resolve from the device). Env values are **inlined at bundle time** — after editing `.env`, restart Expo with `--clear` (`pnpm start --clear`) or the old value persists.
- Delivery photos are uploaded **directly to Supabase Storage** (bucket `delivery-photos`) from the app using the rider's session, then the returned public URL is sent to the backend when marking a job delivered.
- Supabase client uses `AsyncStorage` for session persistence (`app/lib/supabase.js`)
- `app/` layout:
  - `hooks/useAuth.js` — `AuthProvider` + `useAuth()` exposing the Supabase `session`/`loading`
  - `lib/` — `supabase` client, `api` (axios, base URL from `EXPO_PUBLIC_API_URL`), `notifications` (expo-notifications), `format` helpers
  - `screens/` — `LoginScreen`, `JobsScreen`, `JobDetailScreen`
- Navigation is a lightweight state switch in `App.js` (`Root`): session → jobs list → open job. No navigation library is used.

## esbuild note

pnpm may warn "Ignored build scripts: esbuild". Run `pnpm approve-builds` at the repo root to allow esbuild's postinstall script if Vite fails to start.
