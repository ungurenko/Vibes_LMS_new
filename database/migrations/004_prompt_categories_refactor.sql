-- Migration: Refactor Prompt Categories to dynamic table

-- 1. Create prompt_categories table
CREATE TABLE IF NOT EXISTS prompt_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    color_theme VARCHAR(100), -- CSS classes for coloring (optional override)
    sort_order SMALLINT DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Trigger for updated_at
CREATE TRIGGER update_prompt_categories_updated_at
    BEFORE UPDATE ON prompt_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Insert default categories (from previous ENUM)
INSERT INTO prompt_categories (name, sort_order)
VALUES
    ('Лендинг', 10),
    ('Веб-сервис', 20),
    ('Дизайн', 30),
    ('Фиксы', 40),
    ('Функции', 50),
    ('API', 60),
    ('Оптимизация', 70)
ON CONFLICT (name) DO NOTHING;

-- 3. Add category_id to prompts
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES prompt_categories(id);

-- 4. Migrate data from old enum column to new foreign key
UPDATE prompts p
SET category_id = pc.id
FROM prompt_categories pc
WHERE p.category::text = pc.name;

-- 5. Handle any prompts that didn't match (shouldn't happen with enum, but for safety)
-- If category_id is still NULL, assign to the first category
UPDATE prompts
SET category_id = (SELECT id FROM prompt_categories ORDER BY sort_order LIMIT 1)
WHERE category_id IS NULL;

-- 6. Make category_id NOT NULL
ALTER TABLE prompts ALTER COLUMN category_id SET NOT NULL;

-- 7. Drop old category column and type
-- Note: We drop the dependency on the type first
ALTER TABLE prompts DROP COLUMN category;
DROP TYPE prompt_category;

-- 8. Add index
CREATE INDEX idx_prompts_category_id ON prompts(category_id) WHERE deleted_at IS NULL;
