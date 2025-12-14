# Copilot / AI Agent Instructions

Purpose: help AI coding agents be productive quickly in this repository.

High level
- Monolithic app with two main parts:
  - server/: Express + TypeScript (ESM). API and server-side logic live here. See [server/app.ts](server/app.ts) and [server/routes.ts](server/routes.ts).
  - client/: Vite + React (TSX). UI lives under `client/src`. See [client/src/App.tsx](client/src/App.tsx).

Run & build (project-specific)
- Development (single process, hot reload): `npm run dev` — starts the Express server with Vite middleware via [server/index-dev.ts](server/index-dev.ts).
- Build: `npm run build` — builds client with Vite then bundles server with esbuild (entry: `server/index-prod.ts`).
- Start (production): `npm start` — runs `dist/index.js` produced by the build.
- DB schema push (drizzle): `npm run db:push`.

Key patterns & conventions (do not change without reason)
- API routes are namespaced under `/api` and have an API-wide rate limiter applied in [server/routes.ts](server/routes.ts).
- Body parsing: server uses larger limits for uploads (10MB) and stores raw body on `req.rawBody`; see [server/app.ts](server/app.ts). Handle entity-too-large errors explicitly (413). Keep this behavior when editing middleware.
- Auth: JWT-based token generation + Passport strategies for OAuth (Google, Facebook) in [server/routes.ts]. For local auth, see `server/auth.ts` helpers.
- Storage: there are two storage modes implemented — an in-memory `MemStorage` and a DB-backed layer using `drizzle-orm` in [server/storage.ts] and [server/db.ts]. Note the explicit snake_case → camelCase mapping helpers in `storage.ts`.
- Two-factor: 2FA flows are implemented server-side (`server/twoFactor.ts`) and expected by login endpoints (routes request `twoFactorCode`).
- Audit & rate-limits: request auditing and rate limiting are active for API endpoints; see `middleware.ts` and usages in `routes.ts`.

Important files to inspect for any change
- [package.json](package.json) — scripts and dependencies.
- [server/index-dev.ts](server/index-dev.ts) — dev-time Vite middleware setup (important for HMR and serving client in dev).
- [server/app.ts](server/app.ts) — app bootstrap, body parser limits, final error handler, host/port handling (Windows uses `localhost`).
- [server/routes.ts](server/routes.ts) — bulk of API endpoints (auth, tools, payments, receipts, 2FA, oauth callbacks).
- [server/storage.ts](server/storage.ts) — DB and memory storage shapes and mapping logic.
- [client/src](client/src) — main React app and routing; components follow a context/provider pattern (`context/` directory).

Environment & runtime notes
- Default port: `PORT` env or 5000. On Windows, server binds to `localhost`; on Linux/macOS it uses `0.0.0.0` (see `server/app.ts`).
- OAuth and Stripe require environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FACEBOOK_APP_ID, STRIPE keys, etc.) — missing OAuth creds cause endpoints to return 503.
- Production build bundles server to `dist/index.js`; ensure environment variables are provided to the runtime, not baked into the client.

Editing & PR guidance for agents
- Small focused changes only. When modifying server request/response shapes, update mappings in `server/storage.ts` and any `shared/schema.ts` Zod types first.
- Keep `/api` consistency: preserve route paths and response shape (many client components assume fields like `user.id`, `token`, `twoFactorEnabled`).
- For front-end changes, prefer modifying existing components under `client/src/components` and `client/src/pages` and reuse context providers.

Examples to reference when coding
- Add middleware: mirror style in [server/app.ts](server/app.ts) (use the same logging helper and error handling pattern).
- New API endpoint: register route in [server/routes.ts](server/routes.ts) and ensure `/api` rate limiter and `auditLog` are used when appropriate.
- Database change: update `shared/schema.ts`, run `npm run db:push`, and update mapping helpers in [server/storage.ts](server/storage.ts).

When you are unsure
- Search for similar implementations in `server/` first (routes, auth, storage). If a change affects both client and server, make small complementary edits and flag for human review.

If anything in this file is unclear or you want extra examples (e.g., common HTTP responses, sample env file, or specific lines to look at), tell me which area to expand and I'll iterate.
