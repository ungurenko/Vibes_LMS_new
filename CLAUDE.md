# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VIBES — full-stack educational platform for teaching "vibe coding" (AI-assisted web development). React 19 + TypeScript 5.8 + Vite 6 + PostgreSQL 15+, deployed on Vercel serverless.

**Production:** https://vibes-navy.vercel.app/
**Repository:** https://github.com/ungurenko/Vibes_LMS_new.git
**Default branch for push:** `dev` (push to `main` only when explicitly requested)

## Commands

```bash
npm run dev          # Vite :3000 + API server :3001
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

No tests configured. Verification is `npm run build` + manual testing on Vercel.

## Architecture

### Tech Stack
React 19, Vite 6, Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion, Vercel serverless (Node.js), PostgreSQL, JWT auth (7-day), OpenRouter API for AI.

### Directory Layout

| Path | Purpose |
|------|---------|
| `api/` | Vercel serverless endpoints (thin routers) |
| `api/_lib/` | Backend modules — `_lib/` prefix prevents Vercel endpoint creation |
| `api/_lib/admin/` | 12 handler modules for `/api/admin` |
| `api/_lib/admin-content/` | 4 handler modules for `/api/admin-content` |
| `lib/` | Client utilities (`fetchWithAuth.ts`, `cache.ts`) |
| `lib/hooks/` | Custom hooks (`useCachedFetch`, `useCopyFeedback`, `useAdminFetch`) |
| `components/` | Reusable React components |
| `components/admin/content/` | Admin tab components + EditorForms |
| `views/` | Page components (15 student + admin views) |

### Key Patterns

**API routing:** Catch-all pattern with query params (`?resource=`, `?type=`), not bracket routes. See `vercel.json` rewrites.

**Auth:** `lib/fetchWithAuth.ts` — wraps fetch with JWT from localStorage. Variants: `fetchWithAuthGet/Post/Put/Patch/Delete`. On 401 dispatches `auth:expired` event. **Exception:** SSE streaming in `ToolChat.tsx` and `Assistant.tsx` uses raw fetch (fetchWithAuth calls `response.json()`, incompatible with streaming).

**Caching:** `lib/cache.ts` — TTL-based client cache. `useCachedFetch` hook wraps fetch+cache for views. HTTP caching on `/api/content/styles`.

**Backend modules:** Each exports `(req, res, tokenData)` handler. Imports use `.js` extensions (ESM). Example: `import { handleStudents } from './_lib/admin/students.js'`.

**Code splitting:** Admin views and ToolChat loaded via `React.lazy` in `App.tsx`. Bundle chunks: vendor, motion, markdown via Vite `manualChunks`.

**Soft delete:** Tables use `deleted_at` column, always filter with `WHERE deleted_at IS NULL`.

**Notifications:** `notifications` table → admin sends via `POST /api/admin?resource=notifications`, students read via `GET /api/notifications`. `NotificationBell.tsx` in header (student mode) polls every 60s.

**Email (Resend):** `api/_lib/email.ts` wraps Resend SDK. Templates in `api/_lib/email-templates.ts`. Sends welcome email on student creation, reset email on password change. Non-blocking (fire-and-forget with `.catch()`). Domain: `ungurenko.ru`, from: `noreply@ungurenko.ru`.

**Bulk operations:** `PATCH /api/admin?resource=students` — mass changeCohort/changeStatus/delete/resetPasswords. Floating toolbar in `AdminStudents.tsx` when rows selected. CSV export (client-side, BOM for Excel+Cyrillic).

### Key Files
- `App.tsx` — Main router, state, React.lazy imports, NotificationBell
- `types.ts` — TypeScript interfaces
- `components/Shared.tsx` — Modal, Drawer, Input, Select, PageHeader
- `components/NotificationBell.tsx` — Bell icon + Sheet panel for student notifications
- `api/_lib/db.ts` — PostgreSQL pool (max 3, serverless optimized)
- `api/_lib/auth.ts` — JWT verification, `getUserFromRequest`, `successResponse`/`errorResponse`
- `api/_lib/email.ts` — Resend email wrapper (welcome, reset, reminder, announcement)
- `api/_lib/admin/students.ts` — Full CRUD: GET/POST/PUT/DELETE/PATCH (bulk)

## Critical Constraints

- **Vercel+Vite:** Bracket routes `[param].ts` cause 405 errors — use URL parsing + rewrites instead
- **HTTP headers:** ASCII only (Cyrillic crashes server)
- **LLM JSON:** Always strip markdown wrapper (` ```json `) before `JSON.parse`
- **ESM imports:** Backend modules in `api/_lib/` must use `.js` extensions
- **Auth tokens:** Pass tokens in ALL components, handle 401
- **App.tsx auth:** Do NOT migrate to fetchWithAuth (bootstrap auth, special logic)

## Environment Variables

Required in `.env.local` (and Vercel Dashboard for production):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret (min 32 chars)
- `OPENROUTER_API_KEY` — OpenRouter API (for AI Tools)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob Storage
- `RESEND_API_KEY` — Resend email service (optional, emails skipped if missing)

## TypeScript

- Path alias: `@/*` maps to project root
- Target: ES2022, Module: ESNext, JSX: react-jsx

## Modular Docs

See `.claude/rules/` for domain-specific documentation:
- `api.md` — API endpoints, AI tools system, admin routing
- `database.md` — Schema, migrations, tables, patterns
- `integrations.md` — External services checklist (Vercel Blob, etc.)
