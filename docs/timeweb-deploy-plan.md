# План: Тестовый деплой Vibes LMS на TimeWeb

## Контекст

Цель — развернуть тестовую копию Vibes LMS на TimeWeb App Platform. Vercel остаётся основной площадкой, TimeWeb — для тестирования. Нужно минимизировать изменения кода, чтобы не сломать Vercel-деплой.

**Проблема с двумя приложениями:** В проекте 40+ прямых вызовов `fetch('/api/...')` в 5 файлах (App.tsx, ToolChat.tsx, Assistant.tsx, Register.tsx, AdminContent.tsx), которые не проходят через `fetchWithAuth.ts`. Разделение на два приложения потребовало бы рефакторинг всех этих вызовов + настройку CORS. Это слишком много изменений для тестового деплоя.

**Рекомендация: одно Backend App (Node.js)**, которое раздаёт и статику (`dist/`), и API (`/api/*`) с одного домена. Это:
- Ноль изменений во фронтенд-коде (все `/api/*` пути остаются относительными)
- Не нужен CORS
- Vercel-деплой остаётся полностью нетронутым
- Разделить на два приложения можно позже, когда будет время на рефакторинг fetch-вызовов

---

## Что меняем

### 1. Новый файл: `server.ts` (production Express-сервер)

Расширяем существующий `dev-server.js` до production-ready сервера:

```
- Express 5 (уже в devDependencies → перенести в dependencies)
- Раздаёт dist/ как статику (с правильным кешированием)
- Проксирует /api/* на те же handler-ы что и Vercel serverless
- SPA fallback: все остальные пути → index.html
- Healthcheck: GET /health
- Graceful shutdown
- Слушает process.env.PORT (TimeWeb устанавливает автоматически)
```

Ключевые отличия от `dev-server.js`:
- `cors` middleware не нужен (один домен)
- Раздача статики `dist/` с headers из vercel.json (assets → immutable cache, html → no-cache)
- `body-parser` для JSON (уже есть `express.json()`)
- Нет загрузки `.env.local` в production (`NODE_ENV=production`)
- Запуск через `tsx server.ts` (TypeScript, ESM)

### 2. Изменить: `api/_lib/db.ts`

```diff
- max: 1,        // Serverless
- min: 0,
- allowExitOnIdle: true,
+ max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 1,
+ min: 0,
+ allowExitOnIdle: process.env.NODE_ENV !== 'production' || !process.env.DB_POOL_MAX,
```

Через env-переменную `DB_POOL_MAX`:
- Vercel: не задана → `max: 1` (как сейчас)
- TimeWeb: `DB_POOL_MAX=5` → `max: 5`

### 3. Изменить: `api/upload.ts`

Заменить `@vercel/blob` на адаптер с фолбеком:

```typescript
// Если есть S3 credentials → загружаем в S3
// Если есть BLOB_READ_WRITE_TOKEN → используем Vercel Blob (как сейчас)
// Это позволяет обоим деплоям работать без конфликтов
```

Новый файл `api/_lib/storage.ts`:
- Экспортирует `uploadFile(buffer, filename, mimeType) → { url }`
- Внутри: проверяет env-переменные и выбирает провайдер (S3 или Vercel Blob)

### 4. Изменить: `package.json`

```diff
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:vite\"",
    "dev:api": "tsx dev-server.js",
    "dev:vite": "vite",
    "build": "vite build",
+   "start": "NODE_ENV=production tsx server.ts",
    "preview": "vite preview"
  },
  "dependencies": {
+   "@aws-sdk/client-s3": "^3.0.0",
+   "express": "^5.2.1",     // перенести из devDependencies
  },
+ "engines": {
+   "node": ">=20"
+ }
```

### 5. Новый файл: `api/_lib/storage.ts`

S3-клиент + адаптер:
```typescript
export async function uploadFile(
  buffer: Buffer, filename: string, mimeType: string
): Promise<{ url: string }>
```

---

## Файлы: полный список

| Файл | Действие | Описание |
|------|----------|----------|
| `server.ts` | Создать | Production Express-сервер (статика + API) |
| `api/_lib/storage.ts` | Создать | Адаптер хранилища (S3 / Vercel Blob) |
| `api/upload.ts` | Изменить | Использовать storage.ts вместо прямого @vercel/blob |
| `api/_lib/db.ts` | Изменить | Конфигурируемый pool через DB_POOL_MAX |
| `package.json` | Изменить | Скрипт `start`, зависимости, engines |

**Не трогаем:** фронтенд-код, fetchWithAuth.ts, App.tsx, vercel.json, все view-компоненты.

---

## TimeWeb: настройки приложения

| Параметр | Значение |
|----------|----------|
| **Тип** | Backend App (Node.js) |
| **Фреймворк** | Express |
| **Node.js** | 20.x+ |
| **Install** | `npm ci` |
| **Build** | `npm run build` |
| **Start** | `npm start` |
| **Port** | `PORT` (TimeWeb задаёт автоматически) |
| **Ветка** | `dev` |
| **Автодеплой** | Выключить (тестовый) |

### Переменные окружения

```
NODE_ENV=production
DATABASE_URL=<текущий connection string>
JWT_SECRET=<текущий секрет>
OPENROUTER_API_KEY=<текущий ключ>
DB_POOL_MAX=5

# S3 Storage (TimeWeb S3)
S3_ENDPOINT=<endpoint>
S3_REGION=ru-1
S3_ACCESS_KEY_ID=<ключ>
S3_SECRET_ACCESS_KEY=<секрет>
S3_BUCKET_NAME=vibes-files
S3_PUBLIC_URL=<публичный URL bucket>
```

### Рекомендуемый тариф

**Standard** (~800 руб/мес): 1 CPU 3.3 ГГц, 2 GB RAM, 30 GB NVMe — достаточно для тестирования full-stack приложения с AI-запросами и SSE streaming.

---

## Верификация

1. `npm run build` — убедиться что Vite build проходит
2. `npm start` — локальный запуск production-сервера
3. Открыть `http://localhost:<PORT>` — проверить SPA
4. `curl http://localhost:<PORT>/health` — healthcheck
5. `curl http://localhost:<PORT>/api/content/styles` — API работает
6. Залогиниться → проверить все основные функции
7. Загрузить файл → проверить S3
8. Проверить что `npm run dev` (Vercel-режим) всё ещё работает
9. Задеплоить на TimeWeb → проверить URL
