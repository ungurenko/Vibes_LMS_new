ALTER TABLE users
ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN users.preferences IS 'Настройки интерфейса (тема, звук и т.д.)';
