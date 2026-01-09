-- ============================================================================
-- VIBES Platform - Схема базы данных PostgreSQL
-- Платформа онлайн-обучения вайб-кодингу
--
-- Как использовать:
-- 1. Создай базу данных PostgreSQL
-- 2. Выполни этот файл: psql -d your_database -f schema.sql
-- 3. Затем выполни seed.sql для начальных данных
-- ============================================================================

-- Расширения PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- Для генерации UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Для хеширования паролей

-- ============================================================================
-- ENUM ТИПЫ (Перечисления для статусов и категорий)
-- ============================================================================

-- Статус пользователя
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'completed', 'stalled');

-- Роль пользователя
CREATE TYPE user_role AS ENUM ('student', 'admin', 'mentor');

-- Статус инвайта
CREATE TYPE invite_status AS ENUM ('active', 'used', 'deactivated', 'expired');

-- Статус урока
CREATE TYPE lesson_status AS ENUM ('locked', 'available', 'completed', 'current', 'draft', 'hidden');

-- Статус модуля
CREATE TYPE module_status AS ENUM ('available', 'locked', 'completed');

-- Тип материала урока
CREATE TYPE material_type AS ENUM ('pdf', 'link', 'code', 'figma', 'video');

-- Статус стадии дашборда
CREATE TYPE stage_status AS ENUM ('completed', 'current', 'locked');

-- Категория стиля
CREATE TYPE style_category AS ENUM ('Светлые', 'Тёмные', 'Яркие', 'Минимализм');

-- Категория глоссария
CREATE TYPE glossary_category AS ENUM ('Базовые', 'Код', 'Инструменты', 'API', 'Ошибки', 'Вайб-кодинг');

-- Категория промпта
CREATE TYPE prompt_category AS ENUM ('Лендинг', 'Веб-сервис', 'Дизайн', 'Фиксы', 'Функции', 'API', 'Оптимизация');

-- Категория дорожной карты
CREATE TYPE roadmap_category AS ENUM ('Подготовка', 'Лендинг', 'Веб-сервис', 'Полезное');

-- Сложность дорожной карты
CREATE TYPE difficulty_level AS ENUM ('Легко', 'Средне', 'Сложно');

-- Категория проекта
CREATE TYPE project_category AS ENUM ('Лендинг', 'Веб-сервис', 'E-commerce', 'Креатив');

-- Статус публикации
CREATE TYPE publish_status AS ENUM ('published', 'draft', 'archived', 'moderation');

-- Статус созвона
CREATE TYPE call_status AS ENUM ('scheduled', 'live', 'completed', 'cancelled');

-- Роль в чате
CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');

-- Тип действия в логе
CREATE TYPE activity_type AS ENUM ('lesson', 'project', 'chat', 'login', 'logout', 'registration', 'task_complete', 'roadmap_step');

-- ============================================================================
-- 1. ПОЛЬЗОВАТЕЛИ И АУТЕНТИФИКАЦИЯ
-- ============================================================================

-- Таблица пользователей (студенты, админы, менторы)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Профиль
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    avatar_url TEXT,

    -- Роль и статус
    role user_role NOT NULL DEFAULT 'student',
    status user_status NOT NULL DEFAULT 'active',

    -- Прогресс обучения (для студентов)
    progress_percent SMALLINT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    current_module_id UUID,  -- Ссылка на текущий модуль

    -- Проекты студента (ссылки)
    landing_url TEXT,
    service_url TEXT,
    github_url TEXT,

    -- Заметки администратора
    admin_notes TEXT,

    -- Метаданные
    email_verified BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    last_active_at TIMESTAMPTZ,

    -- Аудит
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ  -- Мягкое удаление (soft delete)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_last_active ON users(last_active_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS 'Пользователи платформы (студенты, админы, менторы)';
COMMENT ON COLUMN users.progress_percent IS 'Процент прохождения курса (0-100)';
COMMENT ON COLUMN users.deleted_at IS 'Если заполнено - пользователь удалён (soft delete)';

-- Таблица инвайт-ссылок для регистрации
CREATE TABLE invite_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(50) UNIQUE NOT NULL,
    status invite_status NOT NULL DEFAULT 'active',

    -- Срок действия
    expires_at TIMESTAMPTZ,

    -- Кем использован
    used_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,

    -- Кто создал
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Аудит
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invite_token ON invite_links(token);
CREATE INDEX idx_invite_status ON invite_links(status);

COMMENT ON TABLE invite_links IS 'Ссылки-приглашения для регистрации новых студентов';

-- ============================================================================
-- 2. МОДУЛИ И УРОКИ КУРСА
-- ============================================================================

-- Модули курса (например: "Записанные уроки", "Прямые эфиры")
CREATE TABLE course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status module_status NOT NULL DEFAULT 'locked',
    sort_order SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_modules_order ON course_modules(sort_order) WHERE deleted_at IS NULL;

COMMENT ON TABLE course_modules IS 'Модули курса (группы уроков)';

-- Уроки внутри модулей
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration VARCHAR(50),  -- "15 мин", "1 ч 30 мин"
    video_url TEXT,        -- Ссылка на видео (YouTube и т.д.)

    status lesson_status NOT NULL DEFAULT 'draft',
    sort_order SMALLINT NOT NULL DEFAULT 0,

    -- Статистика (обновляется автоматически)
    views_count INTEGER DEFAULT 0,
    completions_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_lessons_module ON lessons(module_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_order ON lessons(module_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_status ON lessons(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE lessons IS 'Уроки курса';
COMMENT ON COLUMN lessons.duration IS 'Длительность урока (например: "15 мин")';

-- Материалы к урокам (PDF, ссылки, код)
CREATE TABLE lesson_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    type material_type NOT NULL,
    url TEXT NOT NULL,

    sort_order SMALLINT DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_lesson ON lesson_materials(lesson_id);

COMMENT ON TABLE lesson_materials IS 'Материалы к урокам (PDF, код, ссылки)';

-- Задачи урока (чек-лист для студента)
CREATE TABLE lesson_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    text TEXT NOT NULL,
    sort_order SMALLINT DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_tasks_lesson ON lesson_tasks(lesson_id);

COMMENT ON TABLE lesson_tasks IS 'Задачи урока (чек-лист)';

-- Прогресс студента по урокам
CREATE TABLE user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    status lesson_status NOT NULL DEFAULT 'available',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_user_lesson_progress ON user_lesson_progress(user_id, lesson_id);

COMMENT ON TABLE user_lesson_progress IS 'Прогресс студента по урокам';

-- Прогресс студента по задачам уроков
CREATE TABLE user_lesson_task_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES lesson_tasks(id) ON DELETE CASCADE,

    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, task_id)
);

CREATE INDEX idx_lesson_task_progress_user ON user_lesson_task_progress(user_id);

COMMENT ON TABLE user_lesson_task_progress IS 'Выполненные задачи уроков';

-- ============================================================================
-- 3. СТАДИИ ДАШБОРДА (ПРОГРЕСС ОБУЧЕНИЯ)
-- ============================================================================

-- Стадии обучения (База -> Лендинг -> Сервис -> Запуск)
CREATE TABLE dashboard_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(100),  -- "Неделя 1", "Недели 3-4"
    sort_order SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dashboard_stages IS 'Стадии обучения на дашборде';

-- Задачи по стадиям
CREATE TABLE stage_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id UUID NOT NULL REFERENCES dashboard_stages(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    sort_order SMALLINT DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stage_tasks_stage ON stage_tasks(stage_id);

COMMENT ON TABLE stage_tasks IS 'Задачи по стадиям обучения';

-- Прогресс студента по стадиям
CREATE TABLE user_stage_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES dashboard_stages(id) ON DELETE CASCADE,

    status stage_status NOT NULL DEFAULT 'locked',

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, stage_id)
);

CREATE INDEX idx_user_stage_progress_user ON user_stage_progress(user_id);

COMMENT ON TABLE user_stage_progress IS 'Прогресс студента по стадиям';

-- Прогресс по задачам стадий
CREATE TABLE user_stage_task_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES stage_tasks(id) ON DELETE CASCADE,

    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, task_id)
);

CREATE INDEX idx_stage_task_progress_user ON user_stage_task_progress(user_id);

COMMENT ON TABLE user_stage_task_progress IS 'Выполненные задачи стадий';

-- ============================================================================
-- 4. БИБЛИОТЕКА СТИЛЕЙ ДИЗАЙНА
-- ============================================================================

CREATE TABLE style_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(100) NOT NULL,
    description TEXT,
    long_description TEXT,

    -- Визуал
    gradient VARCHAR(100),   -- CSS классы градиента (Tailwind)
    image_url TEXT,          -- URL картинки-превью

    -- AI промпт для генерации в этом стиле
    prompt TEXT NOT NULL,

    -- Категоризация
    category style_category NOT NULL,
    tags TEXT[],  -- Массив тегов ['Premium', 'Serif', 'Warm']

    -- Статистика и статус
    usage_count INTEGER DEFAULT 0,
    status publish_status NOT NULL DEFAULT 'published',

    sort_order SMALLINT DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_styles_category ON style_cards(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_styles_status ON style_cards(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_styles_tags ON style_cards USING GIN(tags) WHERE deleted_at IS NULL;

COMMENT ON TABLE style_cards IS 'Библиотека дизайн-стилей';
COMMENT ON COLUMN style_cards.prompt IS 'Промпт для AI для генерации в этом стиле';
COMMENT ON COLUMN style_cards.tags IS 'Теги стиля (массив)';

-- ============================================================================
-- 5. ГЛОССАРИЙ ТЕРМИНОВ
-- ============================================================================

CREATE TABLE glossary_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    term VARCHAR(100) NOT NULL,
    slang VARCHAR(255),      -- Сленговые названия ("Фронтенд, фронт")
    definition TEXT NOT NULL,

    category glossary_category NOT NULL,

    sort_order SMALLINT DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_glossary_category ON glossary_terms(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_glossary_term ON glossary_terms(term) WHERE deleted_at IS NULL;

-- Полнотекстовый поиск по глоссарию
CREATE INDEX idx_glossary_search ON glossary_terms
    USING GIN(to_tsvector('russian', term || ' ' || COALESCE(slang, '') || ' ' || definition))
    WHERE deleted_at IS NULL;

COMMENT ON TABLE glossary_terms IS 'Глоссарий терминов вайб-кодинга';
COMMENT ON COLUMN glossary_terms.slang IS 'Сленговые варианты термина';

-- ============================================================================
-- 6. БАЗА ПРОМПТОВ
-- ============================================================================

-- Промпты для генерации
CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,                -- Основной текст промпта (если не multi-step)
    usage_instruction TEXT,      -- Как использовать

    category prompt_category NOT NULL,
    tags TEXT[],

    -- Статистика
    copy_count INTEGER DEFAULT 0,

    status publish_status NOT NULL DEFAULT 'published',
    sort_order SMALLINT DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_prompts_category ON prompts(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_prompts_status ON prompts(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE prompts IS 'База промптов для генерации кода';

-- Шаги для multi-step промптов
CREATE TABLE prompt_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,

    sort_order SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prompt_steps_prompt ON prompt_steps(prompt_id);

COMMENT ON TABLE prompt_steps IS 'Шаги multi-step промптов';

-- ============================================================================
-- 7. ДОРОЖНЫЕ КАРТЫ (ROADMAPS)
-- ============================================================================

CREATE TABLE roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    title VARCHAR(255) NOT NULL,
    description TEXT,

    category roadmap_category NOT NULL,
    icon VARCHAR(10),           -- Эмодзи
    estimated_time VARCHAR(50), -- "30 мин"
    difficulty difficulty_level NOT NULL DEFAULT 'Легко',

    -- Статистика
    active_users_count INTEGER DEFAULT 0,
    completions_count INTEGER DEFAULT 0,

    sort_order SMALLINT DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_roadmaps_category ON roadmaps(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_roadmaps_difficulty ON roadmaps(difficulty) WHERE deleted_at IS NULL;

COMMENT ON TABLE roadmaps IS 'Дорожные карты (пошаговые инструкции)';

-- Шаги дорожных карт
CREATE TABLE roadmap_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    link_url TEXT,
    link_text VARCHAR(100),

    sort_order SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roadmap_steps_roadmap ON roadmap_steps(roadmap_id);

COMMENT ON TABLE roadmap_steps IS 'Шаги дорожных карт';

-- Прогресс пользователя по дорожным картам
CREATE TABLE user_roadmap_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    UNIQUE(user_id, roadmap_id)
);

COMMENT ON TABLE user_roadmap_progress IS 'Прогресс пользователя по roadmap';

-- Прогресс по шагам
CREATE TABLE user_roadmap_step_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES roadmap_steps(id) ON DELETE CASCADE,

    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, step_id)
);

CREATE INDEX idx_roadmap_step_progress_user ON user_roadmap_step_progress(user_id);

COMMENT ON TABLE user_roadmap_step_progress IS 'Выполненные шаги roadmap';

-- ============================================================================
-- 8. ВИТРИНА ПРОЕКТОВ (СООБЩЕСТВО)
-- ============================================================================

CREATE TABLE showcase_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    demo_url TEXT,

    category project_category NOT NULL,

    -- Статистика
    likes_count INTEGER DEFAULT 0,

    status publish_status NOT NULL DEFAULT 'moderation',

    -- Модерация
    moderated_by_id UUID REFERENCES users(id),
    moderated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_showcase_author ON showcase_projects(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_showcase_category ON showcase_projects(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_showcase_status ON showcase_projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_showcase_likes ON showcase_projects(likes_count DESC) WHERE deleted_at IS NULL AND status = 'published';

COMMENT ON TABLE showcase_projects IS 'Проекты студентов для витрины';

-- Лайки проектов
CREATE TABLE project_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES showcase_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_likes_project ON project_likes(project_id);
CREATE INDEX idx_project_likes_user ON project_likes(user_id);

COMMENT ON TABLE project_likes IS 'Лайки проектов';

-- ============================================================================
-- 9. AI АССИСТЕНТ (ЧАТ)
-- ============================================================================

-- Системные инструкции для AI
CREATE TABLE ai_system_instructions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,

    created_by_id UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_system_instructions IS 'Системные промпты для AI-ассистента';
COMMENT ON COLUMN ai_system_instructions.is_active IS 'Активная инструкция (только одна)';

-- Быстрые вопросы для чата
CREATE TABLE quick_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    text VARCHAR(255) NOT NULL,
    sort_order SMALLINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE quick_questions IS 'Быстрые вопросы-подсказки в чате';

-- История чата
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role chat_role NOT NULL,
    content TEXT NOT NULL,

    -- Метаданные (опционально)
    model_used VARCHAR(100),
    tokens_used INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(user_id, created_at DESC);

COMMENT ON TABLE chat_messages IS 'История чата с AI-ассистентом';

-- ============================================================================
-- 10. ПРЯМЫЕ ЭФИРЫ И СОЗВОНЫ
-- ============================================================================

CREATE TABLE admin_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    topic VARCHAR(255) NOT NULL,
    description TEXT,

    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration VARCHAR(50),  -- "90 мин"
    timezone VARCHAR(50) DEFAULT 'Europe/Moscow',

    status call_status NOT NULL DEFAULT 'scheduled',

    meeting_url TEXT,
    recording_url TEXT,

    -- Статистика
    attendees_count INTEGER DEFAULT 0,

    created_by_id UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_calls_date ON admin_calls(scheduled_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_calls_status ON admin_calls(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE admin_calls IS 'Прямые эфиры и созвоны';

-- Материалы к эфирам
CREATE TABLE call_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES admin_calls(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size VARCHAR(50),  -- "2.4 MB"

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_materials_call ON call_materials(call_id);

COMMENT ON TABLE call_materials IS 'Материалы к эфирам';

-- ============================================================================
-- 11. ЛОГ АКТИВНОСТИ
-- ============================================================================

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    action_type activity_type NOT NULL,
    action_description TEXT NOT NULL,
    target_type VARCHAR(50),   -- 'lesson', 'project', etc.
    target_id UUID,
    target_title VARCHAR(255),

    metadata JSONB,  -- Дополнительные данные

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_type ON activity_log(action_type);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_user_recent ON activity_log(user_id, created_at DESC);

COMMENT ON TABLE activity_log IS 'Лог активности пользователей';

-- ============================================================================
-- 12. НАСТРОЙКИ ПЛАТФОРМЫ
-- ============================================================================

-- Глобальные настройки платформы
CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_settings_key ON platform_settings(setting_key);

COMMENT ON TABLE platform_settings IS 'Глобальные настройки платформы (видимость меню, feature flags и т.д.)';
COMMENT ON COLUMN platform_settings.setting_key IS 'Уникальный ключ настройки (например, navigation_config)';
COMMENT ON COLUMN platform_settings.setting_value IS 'Значение настройки в формате JSONB';
COMMENT ON COLUMN platform_settings.updated_by IS 'ID пользователя, который последним изменил настройку';

-- ============================================================================
-- 13. ТРИГГЕРЫ ДЛЯ АВТООБНОВЛЕНИЯ updated_at
-- ============================================================================

-- Функция для автообновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Применяем триггер ко всем таблицам с updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invite_links_updated_at
    BEFORE UPDATE ON invite_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_modules_updated_at
    BEFORE UPDATE ON course_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_stages_updated_at
    BEFORE UPDATE ON dashboard_stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_style_cards_updated_at
    BEFORE UPDATE ON style_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glossary_terms_updated_at
    BEFORE UPDATE ON glossary_terms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at
    BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roadmaps_updated_at
    BEFORE UPDATE ON roadmaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_showcase_projects_updated_at
    BEFORE UPDATE ON showcase_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_system_instructions_updated_at
    BEFORE UPDATE ON ai_system_instructions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quick_questions_updated_at
    BEFORE UPDATE ON quick_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_calls_updated_at
    BEFORE UPDATE ON admin_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 14. ТРИГГЕР ДЛЯ СЧЁТЧИКА ЛАЙКОВ
-- ============================================================================

CREATE OR REPLACE FUNCTION update_project_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE showcase_projects SET likes_count = likes_count + 1 WHERE id = NEW.project_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE showcase_projects SET likes_count = likes_count - 1 WHERE id = OLD.project_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_likes
    AFTER INSERT OR DELETE ON project_likes
    FOR EACH ROW EXECUTE FUNCTION update_project_likes_count();

-- ============================================================================
-- 15. ПОЛЕЗНЫЕ ПРЕДСТАВЛЕНИЯ (VIEWS)
-- ============================================================================

-- Статистика для админ-дашборда
CREATE VIEW admin_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL) as total_students,
    (SELECT COUNT(*) FROM users WHERE role = 'student' AND deleted_at IS NULL AND last_active_at > NOW() - INTERVAL '7 days') as active_students_week,
    (SELECT COALESCE(AVG(progress_percent), 0) FROM users WHERE role = 'student' AND deleted_at IS NULL) as avg_progress,
    (SELECT COUNT(*) FROM showcase_projects WHERE status = 'published' AND deleted_at IS NULL) as total_projects,
    (SELECT COUNT(*) FROM admin_calls WHERE status = 'scheduled' AND deleted_at IS NULL) as upcoming_calls;

COMMENT ON VIEW admin_dashboard_stats IS 'Статистика для админ-панели';

-- Последняя активность студентов
CREATE VIEW recent_student_activity AS
SELECT
    u.id as user_id,
    u.first_name || ' ' || COALESCE(u.last_name, '') as full_name,
    u.avatar_url,
    u.progress_percent,
    al.action_type,
    al.action_description,
    al.target_title,
    al.created_at
FROM users u
JOIN activity_log al ON al.user_id = u.id
WHERE u.role = 'student' AND u.deleted_at IS NULL
ORDER BY al.created_at DESC;

COMMENT ON VIEW recent_student_activity IS 'Последняя активность студентов';

-- ============================================================================
-- КОНЕЦ СХЕМЫ
-- ============================================================================
