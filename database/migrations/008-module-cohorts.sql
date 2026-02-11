-- Junction table: many-to-many modules <-> cohorts
CREATE TABLE IF NOT EXISTS module_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_id, cohort_id)
);

CREATE INDEX IF NOT EXISTS idx_module_cohorts_module ON module_cohorts(module_id);
CREATE INDEX IF NOT EXISTS idx_module_cohorts_cohort ON module_cohorts(cohort_id);

-- Seed: link ALL existing modules to ALL active cohorts
-- (preserves current behavior — students see all modules)
INSERT INTO module_cohorts (module_id, cohort_id)
SELECT cm.id, c.id
FROM course_modules cm
CROSS JOIN cohorts c
WHERE cm.deleted_at IS NULL AND c.deleted_at IS NULL
ON CONFLICT (module_id, cohort_id) DO NOTHING;
