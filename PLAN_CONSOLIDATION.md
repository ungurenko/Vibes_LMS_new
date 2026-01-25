# План консолидации API функций для Vercel Hobby

## Проблема
**Лимит Vercel Hobby:** 12 serverless functions
**Текущее количество:** 14 functions
**Нужно сократить:** минимум 2 функции

---

## Текущая структура (14 функций)

```
api/
├── admin-content.ts      (1)
├── admin.ts              (2)
├── auth/
│   ├── login.ts          (3) ← объединить
│   ├── me.ts             (4) ← объединить
│   └── register.ts       (5) ← объединить
├── calls/
│   └── upcoming.ts       (6)
├── chat.ts               (7)
├── content/
│   ├── glossary.ts       (8) ← объединить
│   ├── prompts.ts        (9) ← объединить
│   ├── roadmaps.ts       (10) ← объединить
│   └── styles.ts         (11) ← объединить
├── lessons.ts            (12)
├── showcase.ts           (13)
└── stages.ts             (14)
```

---

## Решение: Catch-All Routes `[...slug].ts`

Vercel официально поддерживает catch-all синтаксис: `[...slug].ts`

**Как работает:**
- URL: `/api/content/styles` → `req.query.slug = ['styles']`
- URL: `/api/auth/login` → `req.query.slug = ['login']`

**Преимущество:** Параметр передаётся как массив — Vercel гарантирует его наличие.

---

## Целевая структура (9 функций) ✅

```
api/
├── admin-content.ts      (1)
├── admin.ts              (2)
├── auth/
│   └── [...slug].ts      (3) ← login, me, register
├── calls/
│   └── upcoming.ts       (4)
├── chat.ts               (5)
├── content/
│   └── [...slug].ts      (6) ← styles, prompts, glossary, roadmaps
├── lessons.ts            (7)
├── showcase.ts           (8)
└── stages.ts             (9)
```

**Экономия:** 14 - 9 = **5 функций**

---

## Шаги выполнения

### 1. Создать `api/auth/[...slug].ts`

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;
  const endpoint = Array.isArray(slug) ? slug[0] : slug;

  switch (endpoint) {
    case 'login':
      return handleLogin(req, res);
    case 'register':
      return handleRegister(req, res);
    case 'me':
      return handleMe(req, res);
    default:
      return res.status(404).json({ error: 'Not found' });
  }
}

// Скопировать логику из login.ts
async function handleLogin(req, res) { ... }

// Скопировать логику из register.ts
async function handleRegister(req, res) { ... }

// Скопировать логику из me.ts
async function handleMe(req, res) { ... }
```

### 2. Удалить старые auth файлы
```bash
rm api/auth/login.ts
rm api/auth/me.ts
rm api/auth/register.ts
```

### 3. Создать `api/content/[...slug].ts`

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;
  const type = Array.isArray(slug) ? slug[0] : slug;

  switch (type) {
    case 'styles':
      return getStyles(req, res);
    case 'prompts':
      return getPrompts(req, res);
    case 'glossary':
      return getGlossary(req, res);
    case 'roadmaps':
      return getRoadmaps(req, res);
    default:
      return res.status(404).json({ error: 'Content type not found' });
  }
}

// Скопировать логику из styles.ts
async function getStyles(req, res) { ... }

// Скопировать логику из prompts.ts
async function getPrompts(req, res) { ... }

// И т.д.
```

### 4. Удалить старые content файлы
```bash
rm api/content/glossary.ts
rm api/content/prompts.ts
rm api/content/roadmaps.ts
rm api/content/styles.ts
```

### 5. Обновить dev-server.js

Добавить поддержку `[...slug]` в dev-server:

```javascript
// В функции loadApiRoute, после проверки [type].ts
// Добавить проверку [...slug].ts
const catchAllFile = files.find(f => f.startsWith('[...') && f.endsWith('].ts'));
if (catchAllFile) {
  const paramName = catchAllFile.slice(4, -4); // убираем [...] и .ts
  dynamicParams[paramName] = parts.slice(i); // передаём массив сегментов
  routePath = join(dirPath, catchAllFile);
  break;
}
```

### 6. Тестирование локально

```bash
# Запустить dev-server
npm run dev

# Протестировать auth endpoints
curl http://localhost:3001/api/auth/login -d '{"email":"test@test.com","password":"123"}'
curl http://localhost:3001/api/auth/me -H "Authorization: Bearer <token>"

# Протестировать content endpoints
curl http://localhost:3001/api/content/styles -H "Authorization: Bearer <token>"
curl http://localhost:3001/api/content/prompts -H "Authorization: Bearer <token>"
```

### 7. Коммит и деплой

```bash
git add api/
git commit -m "Консолидация API: 14→9 функций через catch-all routes"
git push
```

---

## Чек-лист перед деплоем

- [ ] Локально работает `/api/auth/login`
- [ ] Локально работает `/api/auth/me`
- [ ] Локально работает `/api/auth/register`
- [ ] Локально работает `/api/content/styles`
- [ ] Локально работает `/api/content/prompts`
- [ ] Локально работает `/api/content/glossary`
- [ ] Локально работает `/api/content/roadmaps`
- [ ] `dev-server.js` обновлён для поддержки `[...slug]`

---

## Откат в случае проблем

Если что-то сломается:

```bash
git revert HEAD
git push
```

Vercel автоматически вернётся к предыдущей версии.

---

## Почему это должно работать

1. **Официальный синтаксис Vercel** — `[...slug]` документирован
2. **Параметр как массив** — `req.query.slug = ['styles']` всегда определён
3. **Те же URL** — фронтенд не меняется
4. **Проще отлаживать** — весь код в одном файле

---

## Альтернативы (если не сработает)

### Вариант A: Объединить меньше функций
Объединить только content (4→1), оставить auth раздельными.
**Результат:** 14 - 3 = 11 функций ✅

### Вариант B: Использовать Edge Functions
Edge Functions не считаются в лимит 12, но требуют переписывания кода.

### Вариант C: Hostinger/Railway
Деплой на другой платформе без лимита функций.
