# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## Project Overview

SmartDNS WebUI — a management dashboard for the SmartDNS DNS proxy server. Built with Next.js 16 (App Router), React 19, MUI 7, TypeScript, and TanStack Query. The UI is a **pure client-side SPA** that communicates with a separate SmartDNS backend via REST API.

## Build & Development Commands

- `npm run dev` — Start dev server (proxies `/api/*` to `http://127.0.0.1:6080`)
- `npm run build` — Lint then produce static export (`next build` with `output: 'export'`)
- `npm run lint` — ESLint on `src/`
- `npm run lint:fix` — ESLint with auto-fix
- `npm run typecheck` — TypeScript type-check (`tsc --noEmit`, no emit)
- `npm run format:check` — Prettier dry-run
- `npm run format:write` — Prettier auto-format

There are no test scripts configured. No test runner is set up in `package.json`.

## Architecture

### Dual-Mode Next.js Config (`next.config.mjs`)

- **Dev mode**: `rewrites` proxy all `/api/*` requests to `http://127.0.0.1:6080` (SmartDNS plugin backend must be running locally).
- **Production mode**: `output: 'export'` — fully static site with no server-side rendering. The built `out/` directory is served directly, typically by the SmartDNS Rust plugin's embedded HTTP server.

### Backend API Layer (`src/lib/backend/server.ts`)

`SmartDNSAPI` class (exported as singleton `smartdnsServer`) wraps all REST API calls. Every method returns `{ error?, data? }` tuples. On 401 responses, it auto-triggers sign-out via the registered `signOut` callback. The `DataServer.fetch()` base method handles JSON serialization, credentials, and error normalization.

`src/lib/auth/client.ts` — `AuthClient` singleton manages JWT token lifecycle: login stores token in `localStorage`, a 60s interval refreshes it via `/api/auth/refresh`. Token expiry triggers sign-out.

### Routing & Layout (`src/app/`)

Next.js App Router with these routes:
- `/` — redirects to `/dashboard`
- `/auth/sign-in` — login page
- `/dashboard` — main layout with `AuthGuard` + `ClientLayout` (sidebar + top nav)
  - Sub-pages: overview, query-log, upstream-servers, clients, settings, log, term (xterm terminal)

### Key Subsystems

- **Auth**: `AuthGuard` component wraps `/dashboard/*`, redirects to sign-in if unauthenticated. `UserContext` (via `UserProvider`) holds user state including xterm WebSocket reference.
- **Theme**: Custom MUI theme in `src/styles/theme/` with dark/light mode support via `ThemeProvider`. CSS variables define layout dimensions (nav heights, sidebar width).
- **i18n**: `react-i18next` with `LocalizationProvider` in root layout. No `src/locales/` directory exists in this repo — translations likely come from the backend or are embedded.
- **Dashboard components**: Located in `src/components/dashboard/`. Each feature (query-log, clients, settings, term, etc.) has its own subdirectory.
- **Data fetching**: TanStack React Query (`@tanstack/react-query`) is a dependency but usage is per-component. Charts use Chart.js + apexcharts.

### Path Aliases & Imports

`@/*` maps to `./src/*` (configured in both `tsconfig.json` and ESLint). Prettier enforces import ordering: node → react → next → third-party → internal `@/` groups → relative paths.

### Code Style

- Tabs for indentation, LF line endings, 120 char print width, ES5 trailing commas, double quotes.
- ESLint: TypeScript strict rules, import resolution with alias support, several unicorn rules disabled (see `eslint.config.mjs`).
- Unused vars prefixed with `_` are allowed.

### Backend API Contract

The SmartDNS Rust plugin serves REST endpoints under `/api/`:
- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/check`, `/api/auth/password`
- DNS data: `/api/domain` (query logs), `/api/client` (clients), `/api/upstream-server`, `/api/cache/*`
- Stats: `/api/stats/overview`, `/api/stats/top/client`, `/api/stats/top/domain`, `/api/stats/hourly-query-count`, `/api/stats/daily-query-count`
- Config: `/api/config/settings`, `/api/service/restart`
- Misc: `/api/server/version`, `/api/log/level`, `/api/whois`

All types for request/response are defined in `src/lib/backend/server.ts`.
