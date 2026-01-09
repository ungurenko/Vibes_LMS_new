-- ============================================================================
-- Миграция: Добавление таблицы platform_settings
-- Дата: 2026-01-09
-- Описание: Добавляет таблицу для хранения глобальных настроек платформы,
--           включая конфигурацию видимости навигационных вкладок
-- ============================================================================

-- Создание таблицы platform_settings
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по ключу настройки
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(setting_key);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Вставка начальной конфигурации навигации (все вкладки видимы по умолчанию)
INSERT INTO platform_settings (setting_key, setting_value) VALUES
('navigation_config', '{
  "dashboard": true,
  "lessons": true,
  "roadmaps": true,
  "styles": true,
  "prompts": true,
  "glossary": true,
  "assistant": true
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Комментарии для документации
COMMENT ON TABLE platform_settings IS 'Глобальные настройки платформы (видимость меню, feature flags и т.д.)';
COMMENT ON COLUMN platform_settings.setting_key IS 'Уникальный ключ настройки (например, navigation_config)';
COMMENT ON COLUMN platform_settings.setting_value IS 'Значение настройки в формате JSONB';
COMMENT ON COLUMN platform_settings.updated_by IS 'ID пользователя, который последним изменил настройку';
