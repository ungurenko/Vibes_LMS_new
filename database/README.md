# База данных VIBES Platform

Схема базы данных PostgreSQL для платформы онлайн-обучения вайб-кодингу.

## Содержимое папки

| Файл | Описание |
|------|----------|
| `schema.sql` | Структура таблиц, индексы, триггеры |
| `seed.sql` | Начальные данные (стили, глоссарий, промпты и т.д.) |

## Быстрый старт

### 1. Создание базы данных

#### Вариант A: Timeweb Cloud DBaaS (рекомендуется)

1. Зайди в [Timeweb Cloud](https://timeweb.cloud)
2. Перейди в раздел **Базы данных** → **Создать**
3. Выбери **PostgreSQL** (версия 15+)
4. Выбери конфигурацию (для старта хватит минимальной)
5. После создания скопируй данные подключения:
   - Host
   - Port
   - Database name
   - Username
   - Password

#### Вариант B: Локальный PostgreSQL

```bash
# Создание базы данных
createdb vibes_platform

# Или через psql
psql -c "CREATE DATABASE vibes_platform;"
```

### 2. Применение схемы

```bash
# Подключись к базе и выполни schema.sql
psql -h <HOST> -p <PORT> -U <USER> -d <DATABASE> -f schema.sql

# Затем seed.sql с начальными данными
psql -h <HOST> -p <PORT> -U <USER> -d <DATABASE> -f seed.sql
```

**Пример для Timeweb Cloud:**
```bash
psql -h pg-xxx.timeweb.cloud -p 5432 -U admin -d default_db -f schema.sql
psql -h pg-xxx.timeweb.cloud -p 5432 -U admin -d default_db -f seed.sql
```

### 3. Проверка

```bash
# Подключись к базе
psql -h <HOST> -p <PORT> -U <USER> -d <DATABASE>

# Проверь таблицы
\dt

# Проверь данные
SELECT * FROM users;
SELECT COUNT(*) FROM glossary_terms;
SELECT COUNT(*) FROM style_cards;
```

## Структура базы данных

### Основные таблицы (~28 штук)

```
ПОЛЬЗОВАТЕЛИ И АУТЕНТИФИКАЦИЯ
├── users                    # Студенты, админы, менторы
└── invite_links             # Инвайт-ссылки для регистрации

КОНТЕНТ КУРСА
├── course_modules           # Модули курса
├── lessons                  # Уроки
├── lesson_materials         # Материалы к урокам
└── lesson_tasks             # Задачи уроков (чек-лист)

ПРОГРЕСС ОБУЧЕНИЯ
├── dashboard_stages         # Стадии: База → Лендинг → Сервис → Запуск
├── stage_tasks              # Задачи по стадиям
├── user_lesson_progress     # Прогресс по урокам
├── user_stage_progress      # Прогресс по стадиям
└── user_*_task_progress     # Выполненные задачи

БИБЛИОТЕКИ
├── style_cards              # 7 дизайн-стилей
├── glossary_terms           # 19+ терминов глоссария
├── prompts                  # База промптов
├── prompt_steps             # Шаги multi-step промптов
├── roadmaps                 # 13 дорожных карт
└── roadmap_steps            # Шаги roadmap

СООБЩЕСТВО
├── showcase_projects        # Проекты студентов
└── project_likes            # Лайки проектов

AI АССИСТЕНТ
├── chat_messages            # История чата
├── ai_system_instructions   # Системный промпт
└── quick_questions          # Быстрые вопросы

АДМИН-ФУНКЦИИ
├── admin_calls              # Прямые эфиры
├── call_materials           # Материалы эфиров
└── activity_log             # Лог активности
```

### Диаграмма связей

```
users ─────────────────────────────────────────┐
  │                                            │
  ├── invite_links (used_by_id)                │
  ├── user_lesson_progress                     │
  ├── user_stage_progress                      │
  ├── user_roadmap_progress                    │
  ├── showcase_projects (author_id)            │
  ├── project_likes (user_id)                  │
  ├── chat_messages                            │
  └── activity_log                             │
                                               │
course_modules                                 │
  └── lessons                                  │
        ├── lesson_materials                   │
        └── lesson_tasks                       │
                                               │
dashboard_stages                               │
  └── stage_tasks                              │
                                               │
prompts                                        │
  └── prompt_steps                             │
                                               │
roadmaps                                       │
  └── roadmap_steps                            │
                                               │
admin_calls                                    │
  └── call_materials                           │
```

## Учётные данные по умолчанию

После выполнения `seed.sql` создаётся администратор:

| Поле | Значение |
|------|----------|
| Email | `ungurenkos@icloud.com` |
| Пароль | `neodark` |
| Роль | `admin` |

**ВАЖНО:** Смените пароль после первого входа!

## Подключение из приложения

### Строка подключения

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

### Пример для Node.js (pg)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'pg-xxx.timeweb.cloud',
  port: 5432,
  database: 'default_db',
  user: 'admin',
  password: 'your_password',
  ssl: { rejectUnauthorized: false } // Для Timeweb Cloud
});

// Пример запроса
const result = await pool.query('SELECT * FROM glossary_terms');
```

### Переменные окружения

Создай файл `.env`:

```env
DATABASE_URL=postgresql://admin:password@pg-xxx.timeweb.cloud:5432/default_db
```

## Полезные SQL-запросы

### Получить все стили

```sql
SELECT name, description, category, tags
FROM style_cards
WHERE deleted_at IS NULL
ORDER BY sort_order;
```

### Получить глоссарий по категории

```sql
SELECT term, slang, definition
FROM glossary_terms
WHERE category = 'Базовые' AND deleted_at IS NULL
ORDER BY sort_order;
```

### Получить прогресс студента

```sql
SELECT
  u.first_name,
  u.progress_percent,
  COUNT(ustp.id) as completed_tasks
FROM users u
LEFT JOIN user_stage_task_progress ustp ON ustp.user_id = u.id
WHERE u.id = 'user-id-here'
GROUP BY u.id;
```

### Статистика для админ-панели

```sql
SELECT * FROM admin_dashboard_stats;
```

## Миграции

При изменении схемы:

1. Создай новый файл миграции: `migrations/001_add_new_field.sql`
2. Примени миграцию: `psql ... -f migrations/001_add_new_field.sql`
3. Обнови `schema.sql` для новых установок

## Резервное копирование

### Создать бэкап

```bash
pg_dump -h HOST -p PORT -U USER -d DATABASE > backup_$(date +%Y%m%d).sql
```

### Восстановить из бэкапа

```bash
psql -h HOST -p PORT -U USER -d DATABASE < backup_20240115.sql
```

## Документация Timeweb Cloud

- [Создание базы данных](https://timeweb.cloud/docs/dbaas/dbaas-create)
- [Управление базами](https://timeweb.cloud/docs/dbaas/dbaas-manage)
- [PostgreSQL в Timeweb](https://timeweb.cloud/docs/dbaas/postgresql)
- [Подключение к БД](https://timeweb.cloud/tutorials/microservices/mikroservisy-podklyuchenie-k-baze-dannyh)

## Следующие шаги

После настройки базы данных вам понадобится:

1. **Backend API** — для безопасного взаимодействия фронтенда с БД
2. **Аутентификация** — JWT токены или сессии
3. **Интеграция фронтенда** — замена захардкоженных данных на API-запросы

Это можно сделать с помощью:
- **Node.js + Express** — классический вариант
- **Next.js API Routes** — если используете Next.js
- **Supabase** — готовый BaaS с авто-генерацией API (если передумаете)
