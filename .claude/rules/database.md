---
paths: "api/**/*.ts, database/**/*"
---

# Database

## Connection

`api/_lib/db.ts` — PostgreSQL pool (max 1 connection, serverless optimized).
- `query(text, params)` — single query
- `getClient()` — for transactions (always release in finally block)

Connection string: `DATABASE_URL` from `.env.local`.

## Schema Domains

| Domain | Tables |
|--------|--------|
| Users | `users`, `invite_links` |
| Content | `course_modules`, `lessons`, `lesson_materials`, `lesson_tasks` |
| Progress | `user_lesson_progress`, `user_stage_progress`, `user_roadmap_progress` |
| Libraries | `style_cards`, `glossary_terms`, `prompts`, `prompt_categories`, `prompt_steps` |
| Favorites | `user_prompt_favorites` |
| Community | `showcase_projects`, `project_likes` |
| AI Tools | `tool_chats`, `tool_messages`, `ai_system_instructions` |
| Admin | `activity_log`, `platform_settings` |

## Patterns

- **Soft delete:** `deleted_at` column — always filter `WHERE deleted_at IS NULL`
- **ENUM types:** `user_role`, `lesson_status`, `style_category`, `prompt_category`, etc.
- **Triggers:** Auto-update `updated_at`, auto-count `likes_count`
- **Views:** `admin_dashboard_stats`, `recent_student_activity`
- **Transactions:** Use `getClient()` for multi-query operations

## Migrations

Use Node.js script (psql may not be installed):

```javascript
// run-migration.js
const { Client } = require('pg');
const sql = `-- Your SQL here`;

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('Migration complete');
}
run().catch(console.error);
```

## AI Tools Tables (already in production)

```sql
CREATE TABLE IF NOT EXISTS tool_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_type VARCHAR(20) NOT NULL CHECK (tool_type IN ('assistant', 'tz_helper', 'ideas')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tool_type)
);

CREATE TABLE IF NOT EXISTS tool_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES tool_chats(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  has_copyable_content BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tool_messages_chat_id ON tool_messages(chat_id);
```
