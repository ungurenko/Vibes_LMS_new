/**
 * Миграция: создание таблицы analytics_events
 * Поведенческая аналитика студентов
 */

const { Client } = require('pg');

const sql = `
-- Таблица аналитических событий
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(255),
  target_title VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрых выборок
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_target ON analytics_events(target_type, target_id);
`;

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Migration 010-analytics-events completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

run().catch(process.exit(1));
