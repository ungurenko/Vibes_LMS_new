---
paths: "api/**/*.ts"
---

# API Endpoints & Routing

## Routing Architecture

All endpoints use catch-all pattern with URL/query parsing. Bracket routes `[param].ts` don't work with Vercel+Vite.

`admin.ts` and `admin-content.ts` are thin routers (~90 and ~63 LOC) that delegate to handler modules in `api/_lib/admin/` and `api/_lib/admin-content/`.

Handler signature: `(req: VercelRequest, res: VercelResponse, tokenData: { userId: string; role: string })`

## Authentication (`/api/auth`)
- `POST /api/auth/login` — User login
- `POST /api/auth/register` — Registration with invite code
- `GET /api/auth/me` — Get current user
- `PATCH /api/auth/me` — Update profile

## Admin API (`/api/admin?resource=`)

Requires admin role (except `navigation` GET which is public).

| Resource | Handler Module | Purpose |
|----------|---------------|---------|
| `students` | `admin/students.ts` | Student management (list, update) |
| `student-activity` | `admin/activity.ts` | User activity history |
| `stats` | `admin/stats.ts` | Platform statistics |
| `dashboard-stats` | `admin/stats.ts` | Dashboard aggregate stats |
| `ai-instruction` | `admin/ai-instruction.ts` | AI tools config + models |
| `invites` | `admin/invites.ts` | Invite links CRUD |
| `calls` | `admin/calls.ts` | Admin calls CRUD |
| `lessons` | `admin/lessons.ts` | Lessons/modules CRUD (`?module=modules`) |
| `stages` | `admin/stages.ts` | Dashboard stages CRUD (`?task=tasks`) |
| `navigation` | `admin/navigation.ts` | Navigation visibility |
| `quick-questions` | `admin/quick-questions.ts` | Quick questions CRUD |
| `ai-chats` | `admin/ai-chats.ts` | Student AI chats (list, export, stats) |

## Admin Content (`/api/admin-content?type=`)

Requires admin role.

| Type | Handler Module | Purpose |
|------|---------------|---------|
| `styles` | `admin-content/styles.ts` | Style cards CRUD |
| `glossary` | `admin-content/glossary.ts` | Glossary terms CRUD |
| `prompts` | `admin-content/prompts.ts` | Prompts CRUD |
| `categories` | `admin-content/prompts.ts` | Prompt categories CRUD |
| `roadmaps` | `admin-content/roadmaps.ts` | Roadmaps CRUD (`?step=steps`) |

## Public Content (`/api/content`)
- `/api/content/styles` — Get styles (cached: `max-age=3600, stale-while-revalidate`)
- `/api/content/prompts` — Prompts with filters
- `/api/content/wizard` — Recommended prompts (5)
- `/api/content/categories` — Prompt categories
- `/api/content/glossary` — Glossary terms
- `/api/content/roadmaps` — Roadmaps with user progress
- `/api/content/quick-questions` — Quick questions
- `/api/content/favorites` — User favorites (GET/POST/DELETE)

## Other Endpoints
- `/api/lessons` — Lessons with progress (GET), mark complete (POST)
- `/api/stages` — Stages with tasks (GET), complete task (POST/DELETE)
- `/api/progress` — Roadmap step progress (GET/POST)
- `/api/showcase` — Published projects
- `/api/upload` — File upload to Vercel Blob (max 10MB)
- `/api/chat` — **DEPRECATED**, use `/api/tools`

## AI Tools (`/api/tools`)

Three AI instruments with separate models and prompts:

| Tool Type | Purpose | Default Model |
|-----------|---------|---------------|
| `assistant` | General mentor | google/gemini-2.5-flash-lite |
| `tz_helper` | Spec helper | z-ai/glm-4.7 |
| `ideas` | Idea generator | xiaomi/mimo-v2-flash:free |

Endpoints:
- `GET /api/tools/models` — Current models for all tools
- `GET /api/tools/chats?tool_type=X` — Get/create chat
- `GET /api/tools/messages?tool_type=X` — Message history (up to 100)
- `POST /api/tools/messages` — Send message (SSE streaming)
- `POST /api/tools/transfer` — Transfer idea to another tool
- `DELETE /api/tools/chats?tool_type=X` — Clear history

Copy markers in AI responses:
- `[ТЗ_START]...[ТЗ_END]` — Spec content
- `[IDEA_START]...[IDEA_END]` — Ideas with transfer button

## Response Format

All endpoints use `successResponse(data)` and `errorResponse(message)` from `api/_lib/auth.ts`:
```typescript
{ success: true, data: ... }
{ success: false, error: "message" }
```

## Navigation (TabId)

Student: `dashboard`, `lessons`, `roadmaps`, `styles`, `prompts`, `glossary`, `tools`, `community`, `profile`, `practice`
Admin: `admin-students`, `admin-content`, `admin-calls`, `admin-tools`, `admin-settings`
Auth: `login`, `register`, `onboarding`
