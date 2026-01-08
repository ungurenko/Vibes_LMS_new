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
- `GEMINI_API_KEY` - Google Gemini API key
- `OPENROUTER_API_KEY` - OpenRouter API key (optional, for AI assistant)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)

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
