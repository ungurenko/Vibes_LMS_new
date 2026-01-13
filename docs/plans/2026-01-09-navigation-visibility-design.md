# Дизайн: Управление видимостью вкладок навигации

**Дата:** 2026-01-09
**Автор:** Brainstorming session
**Статус:** Готов к реализации

## Обзор

Добавление функциональности управления видимостью навигационных вкладок для студентов через админ-панель. Админ сможет глобально скрывать/показывать любые разделы студенческого меню (например, скрыть "Дорожные карты" пока контент не готов).

## Требования

### Функциональные

1. Админ может скрывать/показывать любые студенческие вкладки меню
2. Настройки применяются глобально ко всем студентам
3. Изменения вступают в силу мгновенно (после перезагрузки страницы студентом)
4. Все вкладки видимы по умолчанию
5. Вкладка "Дашборд" всегда видима (нельзя скрыть)
6. Управление через UI в разделе "Настройки" админ-панели

### Нефункциональные

1. Настройки хранятся в PostgreSQL (персистентность)
2. Простой и понятный интерфейс с переключателями
3. Graceful degradation: если API недоступен — показываем все вкладки
4. Минимум точек отказа

## Архитектурное решение

### 1. База данных

**Новая таблица `platform_settings`:**

```sql
CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_platform_settings_key ON platform_settings(setting_key);

CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Seed данные:**

```sql
INSERT INTO platform_settings (setting_key, setting_value) VALUES
('navigation_config', '{
  "dashboard": true,
  "lessons": true,
  "roadmaps": true,
  "styles": true,
  "prompts": true,
  "glossary": true,
  "assistant": true
}'::jsonb);
```

**Формат JSONB:**
```json
{
  "dashboard": true,
  "lessons": true,
  "roadmaps": false,  // скрыто
  "styles": true,
  "prompts": true,
  "glossary": true,
  "assistant": true
}
```

### 2. API Endpoints

**Расширение `/api/admin`:**

#### GET `/api/admin?resource=navigation`
Возвращает текущие настройки навигации.

**Response:**
```json
{
  "success": true,
  "data": {
    "dashboard": true,
    "lessons": true,
    "roadmaps": false,
    "styles": true,
    "prompts": true,
    "glossary": true,
    "assistant": true
  }
}
```

#### POST `/api/admin?resource=navigation`
Обновляет настройки навигации.

**Request body:**
```json
{
  "dashboard": true,
  "lessons": true,
  "roadmaps": false,
  "styles": true,
  "prompts": true,
  "glossary": true,
  "assistant": true
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* обновлённая конфигурация */ }
}
```

**Авторизация:** Только пользователи с `role = 'admin'` (проверка JWT).

**Валидация:**
- Все ключи должны быть из списка допустимых вкладок
- Все значения должны быть boolean
- `dashboard` всегда должен быть `true` (защита на уровне API)

### 3. TypeScript интерфейсы

**Добавить в `types.ts`:**

```typescript
export interface NavigationConfig {
  dashboard: boolean;
  lessons: boolean;
  roadmaps: boolean;
  styles: boolean;
  prompts: boolean;
  glossary: boolean;
  assistant: boolean;
}
```

### 4. Компоненты Frontend

#### App.tsx
- Загружает конфигурацию навигации при старте приложения
- Хранит в state: `const [navConfig, setNavConfig] = useState<NavigationConfig | null>(null)`
- Пробрасывает в Sidebar как prop

**Логика:**
```typescript
useEffect(() => {
  fetch('/api/admin?resource=navigation')
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        setNavConfig(result.data);
      }
    })
    .catch(() => {
      // Fallback: null означает показывать все вкладки
      setNavConfig(null);
    });
}, []);
```

#### Sidebar.tsx
- Принимает `navConfig` как prop
- Фильтрует `studentNavItems` на основе конфигурации

**Логика фильтрации:**
```typescript
const visibleNavItems = studentNavItems.filter(item => {
  // Если конфигурация не загружена - показываем все (fallback)
  if (!navConfig) return true;

  // Проверяем видимость вкладки
  return navConfig[item.id] !== false;
});
```

#### AdminSettings.tsx

**Новая секция "Видимость меню":**

```
┌─────────────────────────────────────────┐
│ Видимость меню                          │
│ Управляйте тем, какие разделы видят    │
│ студенты                                │
├─────────────────────────────────────────┤
│                                         │
│ ☑ Дашборд          [disabled]           │
│ ☑ Уроки            [toggle]             │
│ ☐ Дорожные карты   [toggle]             │
│ ☑ Стили            [toggle]             │
│ ☑ Промпты          [toggle]             │
│ ☑ Словарик         [toggle]             │
│ ☑ Ассистент        [toggle]             │
│                                         │
│ ✓ Сохранено                             │
└─────────────────────────────────────────┘
```

**Состояния UI:**
1. **Loading:** Skeleton loader для каждого переключателя
2. **Loaded:** Рабочее состояние с переключателями
3. **Saving:** Индикатор "Сохранение..."
4. **Saved:** "✓ Сохранено" (исчезает через 2 сек)
5. **Error:** "⚠ Ошибка сохранения" + кнопка "Повторить"

**Логика работы:**
- `useEffect` загружает настройки при монтировании
- При переключении toggle → POST запрос к API
- Optimistic update: UI обновляется мгновенно
- При ошибке — откат к предыдущему состоянию
- Debounce 300ms если несколько быстрых переключений

**Disabled элементы:**
- "Дашборд" всегда disabled (нельзя скрыть главную страницу)

## Обработка ошибок

### Сценарии

1. **API недоступен при загрузке приложения:**
   - Fallback: показываем все вкладки студентам
   - Админ видит: "Не удалось загрузить настройки" + кнопка "Повторить"

2. **Ошибка при сохранении настроек:**
   - Откат UI к предыдущему состоянию
   - Toast-уведомление: "Ошибка сохранения, попробуйте ещё раз"
   - Логирование в console

3. **База данных пустая (запись отсутствует):**
   - API создаёт запись с дефолтными значениями (все true)
   - Возвращает созданную конфигурацию

4. **Race condition (быстрые изменения):**
   - Debounce 300ms на запросы
   - Последнее изменение побеждает

### Защита от критических ситуаций

- **Dashboard всегда видим:** проверка на уровне API и UI
- **Если все вкладки скрыты:** автоматически показываем dashboard
- **Авторизация:** только админы имеют доступ к настройкам
- **Валидация:** все ключи и значения проверяются перед сохранением

## План развёртывания

### Шаг 1: Миграция БД
1. Создать файл `database/migrations/001_add_platform_settings.sql`
2. Добавить таблицу `platform_settings`
3. Вставить дефолтную запись с `navigation_config`
4. Выполнить на dev → staging → production

### Шаг 2: Backend (API)
1. Добавить обработчики в `/api/admin.ts`:
   - `GET ?resource=navigation`
   - `POST ?resource=navigation`
2. Добавить авторизацию (только admin)
3. Добавить валидацию входных данных
4. Добавить error handling

### Шаг 3: Frontend (Types)
1. Обновить `types.ts` — добавить `NavigationConfig`

### Шаг 4: Frontend (Components)
1. Обновить `App.tsx` — загрузка конфигурации
2. Обновить `Sidebar.tsx` — фильтрация вкладок
3. Обновить `AdminSettings.tsx` — UI управления

### Шаг 5: Тестирование
1. Проверить скрытие/показ каждой вкладки
2. Проверить fallback при недоступности API
3. Проверить что dashboard нельзя скрыть
4. Проверить работу для нескольких студентов
5. Проверить optimistic updates и откат при ошибке

### Шаг 6: Деплой
1. Выполнить миграцию БД на production
2. Задеплоить код (Vercel auto-deploy)
3. Проверить работоспособность

## Обратная совместимость

- Если `platform_settings` пуста → все вкладки видимы (текущее поведение)
- Существующие студенты не заметят изменений
- Можно развернуть поэтапно: БД → API → UI

## Производительность

- **Кэширование:** конфигурация загружается один раз при старте приложения
- **Индексы:** JSONB индекс на `setting_key` для быстрого поиска
- **Минимум запросов:** студенты не обращаются к API напрямую, конфигурация передаётся через App.tsx

## Дальнейшее развитие (вне скоупа)

Возможные улучшения в будущем:
- Переупорядочивание вкладок (drag-and-drop)
- История изменений настроек
- Расписание видимости (показать с определённой даты)
- Индивидуальные настройки для отдельных студентов

## Файлы для изменения

```
database/
  └─ migrations/001_add_platform_settings.sql   [CREATE]
  └─ schema.sql                                  [MODIFY]
  └─ seed.sql                                    [MODIFY]

api/
  └─ admin.ts                                    [MODIFY]

src/
  ├─ types.ts                                    [MODIFY]
  ├─ App.tsx                                     [MODIFY]
  ├─ components/
  │   └─ Sidebar.tsx                             [MODIFY]
  └─ views/
      └─ AdminSettings.tsx                       [MODIFY]
```

## Критерии готовности

- [ ] Миграция БД выполнена
- [ ] API endpoints работают (GET/POST /api/admin?resource=navigation)
- [ ] UI в AdminSettings позволяет переключать видимость
- [ ] Sidebar корректно фильтрует вкладки
- [ ] Dashboard нельзя скрыть
- [ ] Fallback работает при недоступности API
- [ ] Изменения применяются ко всем студентам
- [ ] Нет ошибок в консоли
- [ ] Протестировано на dev и production
