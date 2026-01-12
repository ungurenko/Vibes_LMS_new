# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VIBES is a full-stack educational platform for teaching "vibe coding" (AI-assisted web development). Built with React 19, TypeScript, and PostgreSQL, deployed on Vercel with serverless functions.

## Commands

```bash
# Development (runs two servers in parallel)
npm run dev          # Vite on :5173 + API server on :3001

# Production
npm run build        # Build to dist/
npm run preview      # Preview production build

# Database setup (PostgreSQL)
psql -h HOST -p PORT -U USER -d DATABASE -f database/schema.sql
psql -h HOST -p PORT -U USER -d DATABASE -f database/seed.sql
```

## Environment Variables

Required in `.env.local`:
- `OPENROUTER_API_KEY` - OpenRouter API key (optional, for AI assistant)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob Storage token (получить: Vercel Dashboard → Storage → Blob → Settings)

**ВАЖНО:** Для production все переменные также должны быть добавлены в Vercel Dashboard → Settings → Environment Variables

## Architecture

### Tech Stack
- **Frontend:** React 19 + TypeScript 5.8 + Vite 6 + Framer Motion + Tailwind CSS (CDN)
- **Backend:** Vercel serverless functions (Node.js)
- **Database:** PostgreSQL 15+ (28 tables)
- **Auth:** JWT (7-day expiry) + bcryptjs password hashing

### Directory Structure

| Directory | Purpose |
|-----------|---------|
| `/api` | Vercel serverless API endpoints |
| `/api/_lib` | Shared utilities (db.ts, auth.ts) |
| `/components` | Reusable React components |
| `/views` | Page/screen components |
| `/database` | PostgreSQL schema and seed data |

### Key Files
- `App.tsx` - Main router and state management
- `types.ts` - TypeScript interfaces
- `data.ts` - Hardcoded content library
- `SoundContext.tsx` - Audio effects provider
- `components/SkeletonLoader.tsx` - Reusable skeleton loaders for all views
- `api/_lib/db.ts` - PostgreSQL connection pool (max 3, serverless optimized)
- `api/_lib/auth.ts` - JWT + bcrypt helpers

### API Endpoints Structure

Uses catch-all pattern with URL parsing (avoids Vercel+Vite bracket-syntax issues):
- `/api/auth` - handles `/api/auth/login`, `/api/auth/register`, `/api/auth/me` via URL parsing
- `/api/content` - handles `/api/content/glossary`, `/api/content/styles`, `/api/content/prompts`
- `/api/admin.ts` - students, stats, invites, ai-instruction
- `/api/lessons.ts` - course lessons with stages
- `/api/showcase.ts` - community projects
- `/api/chat.ts` - AI assistant

### Database Schema Domains
- **Users:** `users`, `invite_links`
- **Content:** `course_modules`, `lessons`, `lesson_materials`, `lesson_tasks`
- **Progress:** `user_lesson_progress`, `user_stage_progress`, `user_roadmap_progress`
- **Libraries:** `style_cards`, `glossary_terms`, `prompts`, `roadmaps`
- **Community:** `showcase_projects`, `project_likes`
- **AI/Admin:** `chat_messages`, `ai_system_instructions`, `activity_log`

### Database Patterns
- **Soft delete:** Tables use `deleted_at` column (filter with `WHERE deleted_at IS NULL`)
- **ENUM types:** `user_role`, `lesson_status`, `style_category`, `prompt_category`, etc.
- **Triggers:** Auto-update `updated_at`, auto-count `likes_count`
- **Views:** `admin_dashboard_stats`, `recent_student_activity`
- **Transactions:** Use `getClient()` from db.ts for multi-query transactions

### Navigation (TabId types)
Student views: `dashboard`, `lessons`, `roadmaps`, `styles`, `prompts`, `glossary`, `assistant`, `community`, `profile`
Admin views: `admin-students`, `admin-content`, `admin-calls`, `admin-assistant`, `admin-settings`
Auth views: `login`, `register`, `onboarding`

## TypeScript Configuration

- Path alias: `@/*` maps to project root
- Strict mode enabled
- Target: ES2022, Module: ESNext

## Deployment

Deployed via Vercel (configured in `vercel.json`):
- Serverless functions for API routes
- Static hosting for React frontend
- CORS headers pre-configured

## Правило: Интеграция с внешними сервисами (Vercel Blob, Storage и др.)

При добавлении интеграций с внешними сервисами (Vercel Blob, S3, Cloudinary и т.д.) **ОБЯЗАТЕЛЬНО** выполнить следующие шаги:

### 1. Проверка типов библиотеки

**ПЕРЕД написанием кода:**
- Установи пакет: `npm install @vercel/blob`
- Проверь актуальную документацию: используй WebSearch для поиска официальной документации текущего года
- Проверь типы TypeScript: посмотри какие поля возвращает API (например, `PutBlobResult` может не иметь `size`)

**Пример ошибки:**
```typescript
// ❌ НЕПРАВИЛЬНО - не проверил типы
const blob = await put(filename, buffer);
return { url: blob.url, size: blob.size }; // blob.size не существует!

// ✅ ПРАВИЛЬНО - проверил документацию
const blob = await put(filename, buffer);
return { url: blob.url, size: buffer.length }; // используем размер из buffer
```

### 2. Environment Variables ДО деплоя

**ДО создания pull request или git push:**

1. **Добавь в `.env.local` (для локальной разработки):**
   ```bash
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
   ```

2. **Добавь в Vercel Dashboard (для production):**
   - Settings → Environment Variables
   - Добавь все требуемые токены для Production и Preview
   - **ОБЯЗАТЕЛЬНО** сделай это ДО деплоя, а не после

3. **Обнови документацию:**
   - Добавь новую переменную в раздел "Environment Variables" этого файла
   - Укажи где её получить и как настроить

**Текущие env variables для внешних сервисов:**
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob Storage (получить: Vercel Dashboard → Storage → Blob → Settings)

### 3. Обработка ошибок с деталями

При интеграции с внешними API всегда добавляй подробное логирование:

```typescript
try {
  const blob = await put(filename, buffer, { access: 'public' });
  return res.json(successResponse({ url: blob.url }));
} catch (error) {
  // ✅ ПРАВИЛЬНО - логируем полную ошибку
  console.error('Vercel Blob upload error:', {
    filename,
    size: buffer.length,
    error: error instanceof Error ? error.message : error
  });
  return res.status(500).json(errorResponse(
    `Ошибка загрузки в Blob: ${error instanceof Error ? error.message : 'Unknown error'}`
  ));
}
```

### 4. Чеклист перед деплоем

- [ ] Проверил типы библиотеки в документации
- [ ] Добавил env variables в `.env.local`
- [ ] Добавил env variables в Vercel Dashboard
- [ ] Обновил CLAUDE.md с новыми переменными
- [ ] Добавил обработку ошибок с подробным логированием
- [ ] Протестировал локально (если возможно)
- [ ] Сделал коммит с описанием требуемой настройки

### Почему это важно

**Без проверки типов:**
- TypeScript ошибки на Vercel при деплое
- Код не компилируется → deployment fails

**Без env variables:**
- API возвращает 500 ошибки
- Пользователи видят "Ошибка загрузки"
- Нужен дополнительный redeploy после добавления токена

**Правило 80/20:** 80% проблем с внешними сервисами — это отсутствие токенов или неправильные типы. Проверяй это ПЕРЕД деплоем, а не ПОСЛЕ.

## Database Connection

Прямое подключение к PostgreSQL для миграций и отладки:

```bash
export PGSSLROOTCERT=$HOME/.cloud-certs/root.crt
psql 'postgresql://gen_user:MkKoNHutAX2Y%40E@5536e7cf4e31035978aa2f37.twc1.net:5432/vibes_platform?sslmode=verify-full'
```

**Важно:** Используй это подключение для:
- Миграций схемы БД
- Отладки данных
- Ручных SQL-запросов

Для кода приложения используй `DATABASE_URL` из `.env.local`.
