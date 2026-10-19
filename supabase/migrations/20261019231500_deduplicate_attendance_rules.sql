-- Migration: Deduplicate attendance_rules and prevent duplicate rules
-- Description: Cleans duplicate seed/restore rows from attendance_rules and adds a unique index

DELETE FROM public.attendance_rules a
USING public.attendance_rules b
WHERE a.id <> b.id
  AND (a.created_at > b.created_at OR (a.created_at = b.created_at AND a.id::text > b.id::text))
  AND a.entity_type = b.entity_type
  AND a.rule_type = b.rule_type
  AND coalesce(a.config->>'counts_as', lower(a.name)) = coalesce(b.config->>'counts_as', lower(b.name));

-- Unique expression index to prevent future duplicate status rules per entity
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_rules_entity_counts_as 
ON public.attendance_rules (entity_type, rule_type, (coalesce(config->>'counts_as', lower(name))));
