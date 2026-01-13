-- Migration: Add reminders column to admin_calls table
-- Description: Add reminders JSONB column to support call reminders functionality

-- Add reminders column
ALTER TABLE admin_calls
ADD COLUMN reminders TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN admin_calls.reminders IS 'Массив напоминаний для созвона (["24h", "1h", "15m"])';
