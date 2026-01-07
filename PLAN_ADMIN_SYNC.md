# План: Синхронизация админ-панели с базой данных и фронтендом студентов

## Проблема

При создании уроков в админ-панели данные **НЕ сохраняются в базу данных**, потому что:

1. **AdminContent.tsx** работает только с локальным состоянием React, не делает API вызовов
2. **AdminCalls.tsx** использует старые пути API (`/api/admin/calls`), которые были удалены
3. **API** имеет баги: несуществующее поле в БД, PUT не обновляет материалы

## Корневые причины

| Компонент | Проблема |
|-----------|----------|
| `views/AdminContent.tsx` | Использует props `modules` и `onUpdateModules` вместо реальных fetch к API |
| `views/AdminCalls.tsx` | Вызывает `/api/admin/calls` вместо `/api/admin?resource=calls` |
| `api/lessons.ts` | Пытается получить `last_watched_position` которого нет в БД |
| `api/admin.ts` | PUT endpoint не обновляет материалы уроков |

---

## План исправления

### Шаг 1: Исправить AdminCalls.tsx - обновить пути API

**Файл:** `views/AdminCalls.tsx`

**Изменения:**
```javascript
// Было:
fetch('/api/admin/calls', ...)

// Стало:
fetch('/api/admin?resource=calls', ...)

// Было:
fetch(`/api/admin/calls?id=${id}`, ...)

// Стало:
fetch(`/api/admin?resource=calls&id=${id}`, ...)
```

---

### Шаг 2: Добавить API интеграцию в AdminContent.tsx

**Файл:** `views/AdminContent.tsx`

**Изменения:**

1. Добавить `useEffect` для загрузки данных:
```javascript
useEffect(() => {
  const loadData = async () => {
    const token = localStorage.getItem('vibes_token');
    const response = await fetch('/api/admin?resource=lessons', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if (result.success) setModules(result.data);
  };
  loadData();
}, []);
```

2. Заменить локальные операции на API вызовы:

**Создание урока:**
```javascript
const createLesson = async (lessonData) => {
  const response = await fetch('/api/admin?resource=lessons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(lessonData)
  });
  // Перезагрузить данные
};
```

**Обновление урока:**
```javascript
const updateLesson = async (lessonData) => {
  await fetch('/api/admin?resource=lessons', {
    method: 'PUT',
    headers: { ... },
    body: JSON.stringify(lessonData)
  });
};
```

**Удаление урока:**
```javascript
const deleteLesson = async (lessonId) => {
  await fetch(`/api/admin?resource=lessons&id=${lessonId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};
```

3. Аналогично для контента (стили, глоссарий, промпты, дорожные карты):
```javascript
// Стили
fetch('/api/admin-content?type=styles', ...)

// Глоссарий
fetch('/api/admin-content?type=glossary', ...)

// Промпты
fetch('/api/admin-content?type=prompts', ...)

// Дорожные карты
fetch('/api/admin-content?type=roadmaps', ...)
```

---

### Шаг 3: Исправить api/lessons.ts - убрать несуществующее поле

**Файл:** `api/lessons.ts`

**Изменения:**

```javascript
// Было (строка ~60):
const { rows: progress } = await query(
  `SELECT lesson_id, completed_at, last_watched_position
   FROM user_lesson_progress
   WHERE user_id = $1`,
  [userId]
);

// Стало:
const { rows: progress } = await query(
  `SELECT lesson_id, completed_at
   FROM user_lesson_progress
   WHERE user_id = $1`,
  [userId]
);
```

И убрать `lastWatchedPosition` из маппинга ответа.

---

### Шаг 4: Исправить api/admin.ts - обновление материалов

**Файл:** `api/admin.ts`

**Изменения в функции `updateLesson`:**

```javascript
async function updateLesson(req, res) {
  const { id, title, description, duration, videoUrl, status, sortOrder, materials } = req.body;

  // 1. Обновить урок
  const { rows, rowCount } = await query(
    `UPDATE lessons SET ... WHERE id = $X`,
    [...]
  );

  // 2. Если переданы материалы - обновить их
  if (materials && Array.isArray(materials)) {
    // Удалить старые материалы
    await query(
      `DELETE FROM lesson_materials WHERE lesson_id = $1`,
      [id]
    );

    // Добавить новые материалы
    for (const material of materials) {
      await query(
        `INSERT INTO lesson_materials (lesson_id, title, type, url, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, material.title, material.type, material.url, material.sortOrder || 0]
      );
    }
  }

  // 3. Получить материалы для ответа
  const { rows: materialRows } = await query(
    `SELECT id, title, type, url FROM lesson_materials WHERE lesson_id = $1`,
    [id]
  );

  return res.status(200).json(successResponse({
    ...updatedLesson,
    materials: materialRows
  }));
}
```

---

## Критические файлы для изменения

1. `views/AdminCalls.tsx` - обновить API пути
2. `views/AdminContent.tsx` - добавить реальные API вызовы
3. `api/lessons.ts` - убрать `last_watched_position`
4. `api/admin.ts` - исправить updateLesson для материалов

---

## Порядок выполнения

1. ✅ Шаг 1: AdminCalls.tsx (быстрое исправление путей)
2. ✅ Шаг 3: api/lessons.ts (исправить SQL ошибку)
3. ✅ Шаг 4: api/admin.ts (добавить обновление материалов)
4. ✅ Шаг 2: AdminContent.tsx (большое изменение - интеграция API)

---

## Ожидаемый результат

После исправлений:
- ✅ Админ создаёт урок → данные сохраняются в PostgreSQL
- ✅ Студент заходит в приложение → видит уроки из БД
- ✅ Полная синхронизация между админ-панелью и студенческим интерфейсом

---

## API Reference (новая структура)

### Admin Lessons
```
GET    /api/admin?resource=lessons             - список модулей и уроков
POST   /api/admin?resource=lessons             - создать урок
PUT    /api/admin?resource=lessons             - обновить урок
DELETE /api/admin?resource=lessons&id=X        - удалить урок

POST   /api/admin?resource=lessons&module=modules   - создать модуль
PUT    /api/admin?resource=lessons&module=modules   - обновить модуль
DELETE /api/admin?resource=lessons&module=modules&id=X - удалить модуль
```

### Admin Content
```
GET    /api/admin-content?type=styles          - список стилей
POST   /api/admin-content?type=styles          - создать стиль
PUT    /api/admin-content?type=styles          - обновить стиль
DELETE /api/admin-content?type=styles&id=X     - удалить стиль

// Аналогично для: glossary, prompts, roadmaps
```

### Student Lessons
```
GET    /api/lessons                            - уроки для студента (с прогрессом)
```
