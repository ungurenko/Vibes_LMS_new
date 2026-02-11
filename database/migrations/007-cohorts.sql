-- Миграция: Мульти-когортная система (потоки)
-- Добавляет таблицу cohorts, cohort_id в существующие таблицы,
-- таблицу кросс-доступа и мигрирует существующие данные

-- 1. Таблица когорт
CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 2. Добавить cohort_id в существующие таблицы
ALTER TABLE users ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id);
ALTER TABLE dashboard_stages ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id);
ALTER TABLE admin_calls ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id);
ALTER TABLE invite_links ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id);

-- 3. Индексы
CREATE INDEX IF NOT EXISTS idx_users_cohort ON users(cohort_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stages_cohort ON dashboard_stages(cohort_id);
CREATE INDEX IF NOT EXISTS idx_calls_cohort ON admin_calls(cohort_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invites_cohort ON invite_links(cohort_id);

-- 4. Таблица кросс-доступа к записям созвонов
CREATE TABLE IF NOT EXISTS cohort_call_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES admin_calls(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_id, cohort_id)
);

-- 5. Миграция существующих данных: создать "Поток 1" и привязать всё
INSERT INTO cohorts (name, description, is_active, sort_order)
VALUES ('Поток 1', 'Первый поток курса', true, 1)
ON CONFLICT DO NOTHING;

-- Привязать существующие данные к "Поток 1"
UPDATE users SET cohort_id = (SELECT id FROM cohorts WHERE name = 'Поток 1' LIMIT 1)
  WHERE role = 'student' AND cohort_id IS NULL;

UPDATE dashboard_stages SET cohort_id = (SELECT id FROM cohorts WHERE name = 'Поток 1' LIMIT 1)
  WHERE cohort_id IS NULL;

UPDATE admin_calls SET cohort_id = (SELECT id FROM cohorts WHERE name = 'Поток 1' LIMIT 1)
  WHERE cohort_id IS NULL;

UPDATE invite_links SET cohort_id = (SELECT id FROM cohorts WHERE name = 'Поток 1' LIMIT 1)
  WHERE cohort_id IS NULL;
