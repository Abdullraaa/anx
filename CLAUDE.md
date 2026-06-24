# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package manager

Always use **pnpm**. Never use npm or yarn.

## Monorepo structure

```
anx/
├── admin-dashboard/   React 18 + Vite 5 + Tailwind v4 (web)
├── rider-app/         Expo React Native (mobile)
└── backend/           Node.js + Express API
```

`admin-dashboard` and `backend` are pnpm workspace packages. `rider-app` is an Expo project managed separately within the repo.

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
pnpm run android
pnpm run ios
pnpm run web
```

## Key details

### admin-dashboard
- Tailwind v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed; configured entirely in `vite.config.ts`
- CSS entry: `src/index.css` with `@import "tailwindcss"`
- Env vars must be prefixed `VITE_` to be exposed to the browser
- All screens must be fully mobile responsive

### backend
- ESM (`"type": "module"`) — use `import`/`export`, not `require`
- Health endpoint: `GET /health` → `{ status: 'ok' }`
- Uses service role key (not anon key) for Supabase access
- Middleware order: helmet → cors → express.json → routes

### rider-app
- Supabase client uses `AsyncStorage` for session persistence (`app/lib/supabase.js`)
- Env vars read via `process.env` (configure with `expo-constants` or a `.env` loader if needed)

## esbuild note

pnpm may warn "Ignored build scripts: esbuild". Run `pnpm approve-builds` at the repo root to allow esbuild's postinstall script if Vite fails to start.
