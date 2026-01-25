/**
 * Миграция: Добавление таблицы избранных промптов
 *
 * Запуск: node database/migrations/add-favorite-prompts.js
 */

const { Client } = require('pg');

// DATABASE_URL из CLAUDE.md для прямого подключения
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://gen_user:MkKoNHutAX2Y%40E@5536e7cf4e31035978aa2f37.twc1.net:5432/vibes_platform';

const sql = `
-- Таблица избранных промптов
CREATE TABLE IF NOT EXISTS user_favorite_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, prompt_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_favorite_prompts_user ON user_favorite_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_prompts_user_prompt ON user_favorite_prompts(user_id, prompt_id);

-- Комментарии для документации
COMMENT ON TABLE user_favorite_prompts IS 'Избранные промпты пользователей';
COMMENT ON COLUMN user_favorite_prompts.user_id IS 'ID пользователя';
COMMENT ON COLUMN user_favorite_prompts.prompt_id IS 'ID промпта';
`;

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    await client.query(sql);
    console.log('Migration completed: user_favorite_prompts table created');

    // Проверяем результат
    const { rows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'user_favorite_prompts'
    `);

    if (rows.length > 0) {
      console.log('✓ Table verified successfully');
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
