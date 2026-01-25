/**
 * Миграция: добавление полей work_stage и task_type для навигации промптов
 *
 * Запуск: node database/migrations/add_prompt_navigation_fields.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const { Client } = pg;

const sql = `
-- Создаём ENUM типы для новых полей
DO $$ BEGIN
    CREATE TYPE work_stage_type AS ENUM ('structure', 'design', 'functionality');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_type_type AS ENUM ('modify', 'fix', 'optimize');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Добавляем колонки в таблицу prompts
ALTER TABLE prompts
ADD COLUMN IF NOT EXISTS work_stage work_stage_type;

ALTER TABLE prompts
ADD COLUMN IF NOT EXISTS task_type task_type_type;

-- Создаём индексы для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_prompts_work_stage ON prompts(work_stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_task_type ON prompts(task_type) WHERE deleted_at IS NULL;

-- Комбинированный индекс для фильтрации по обоим полям
CREATE INDEX IF NOT EXISTS idx_prompts_stage_type ON prompts(work_stage, task_type) WHERE deleted_at IS NULL;

COMMENT ON COLUMN prompts.work_stage IS 'Этап работы: structure (структура), design (дизайн), functionality (функционал)';
COMMENT ON COLUMN prompts.task_type IS 'Тип задачи: modify (изменить), fix (исправить), optimize (оптимизировать)';
`;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Подключено к БД');

    await client.query(sql);
    console.log('Миграция выполнена успешно!');
    console.log('Добавлены поля: work_stage, task_type');
    console.log('Созданы индексы: idx_prompts_work_stage, idx_prompts_task_type, idx_prompts_stage_type');

  } catch (error) {
    console.error('Ошибка миграции:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
