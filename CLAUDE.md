# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package manager

Always use **pnpm**. Never use npm or yarn.

## Monorepo structure

```
anx/
├── admin-dashboard/   React 18 + Vite 5 + Tailwind v4 (web)
├── rider-app/         Expo SDK 54 React Native (mobile)
└── backend/           Node.js + Express API
```

`admin-dashboard` and `backend` are pnpm workspace packages (see `pnpm-workspace.yaml`). `rider-app` is a plain directory in the monorepo (not a workspace package, not a git submodule) with its own `package.json`/`pnpm-lock.yaml`; run its commands from inside `rider-app/`.

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

### admin-dashboard
- Tailwind v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed; configured entirely in `vite.config.ts`
- CSS entry: `src/index.css` with `@import "tailwindcss"`
- Env vars must be prefixed `VITE_` to be exposed to the browser
- All screens must be fully mobile responsive

### backend
- ESM (`"type": "module"`) — use `import`/`export`, not `require`
- Runs on port 3000 (`PORT` in `backend/.env`); health endpoint: `GET /health` → `{ status: 'ok' }`
- Uses the **service role key** (not anon key) for Supabase access — so backend queries **bypass RLS entirely**. RLS policies only matter for clients that talk to Supabase directly (e.g. the rider app's Storage uploads).
- Middleware order: helmet → cors → express.json → routes
- Auth model: no email — riders/admins log in with **phone + password**, mapped to a Supabase Auth email of `{phone}@logistics.app`. `POST /api/auth/login` returns `{ session, user }`. Protected routes use `requireAuth` (verifies the `Bearer` token, loads the `users` profile onto `req.user`); admin-only routes add `requireAdmin`.
- SQL lives in `backend/supabase/migrations/` (`001` schema + RLS, `002` seed zones/pricing, `003` storage policies, `004` rider deactivation). **No Supabase CLI is linked** — apply migrations manually via the Supabase SQL Editor or `psql` (needs the DB password from the Supabase dashboard).
- Delivery photos: Supabase Storage bucket `delivery-photos` (public-read, no size/mime limits). Riders upload directly from the app, so uploads require the Storage INSERT policy in migration `003`. **Never use `upsert: true` on these uploads** — Storage upserts require an UPDATE policy on `storage.objects` (even for brand-new paths), and only an INSERT policy exists, so upserts fail with an RLS violation.
- There is **no separate riders table** — riders and admins are both rows in `users`, split by `role`. Rider deactivation is `users.is_active` (migration `004`): inactive riders keep all job/photo/payout history but are excluded from the assign-rider picker and rejected by `PATCH /api/jobs/:id/assign`. They can still log in to the rider app (intentional, for now).
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
