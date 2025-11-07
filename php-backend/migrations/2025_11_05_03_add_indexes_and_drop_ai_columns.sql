-- Migration: Add helpful indexes for material_ai_versions and drop ai_* columns from learning_materials
-- Purpose: Optimize queries for fetching latest artifacts and clean up deprecated columns.
-- Run AFTER backfill migration (2025_11_05_02) and AFTER verifying backend code works with material_ai_versions.

-- Step 1: Add index to fetch latest artifacts by (material_id, type, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_mav_material_type_created 
  ON public.material_ai_versions (material_id, type, created_at DESC);

-- Step 2: Add index to support queries on material_id alone
CREATE INDEX IF NOT EXISTS idx_mav_material_id 
  ON public.material_ai_versions (material_id);

-- Step 3: Add GIN index on content for searching inside JSON payloads (optional but useful)
CREATE INDEX IF NOT EXISTS idx_mav_content_gin 
  ON public.material_ai_versions USING gin (content);

-- Step 4: Drop deprecated ai_* columns from learning_materials
-- WARNING: Only run this AFTER verifying backend and frontend work correctly with material_ai_versions.
-- Uncomment the lines below when ready to drop columns:

-- ALTER TABLE public.learning_materials DROP COLUMN IF EXISTS ai_summary;
-- ALTER TABLE public.learning_materials DROP COLUMN IF EXISTS ai_keypoints;
-- ALTER TABLE public.learning_materials DROP COLUMN IF EXISTS ai_quiz;
-- ALTER TABLE public.learning_materials DROP COLUMN IF EXISTS ai_flashcards;
-- ALTER TABLE public.learning_materials DROP COLUMN IF EXISTS ai_generated_at;
-- ALTER TABLE public.learning_materials DROP COLUMN IF EXISTS ai_quiz_generated;
-- ALTER TABLE public.learning_materials DROP COLUMN IF EXISTS ai_limit_count;

-- Optional: Keep ai_toggle_enabled and ai_status if they control generation workflow.
-- Optional: Add new columns for pointer if you want fast reads (not needed for Option B pure):
-- ALTER TABLE public.learning_materials ADD COLUMN IF NOT EXISTS latest_ai_summary_id uuid REFERENCES material_ai_versions(ai_version_id) ON DELETE SET NULL;
-- ALTER TABLE public.learning_materials ADD COLUMN IF NOT EXISTS latest_ai_keypoints_id uuid REFERENCES material_ai_versions(ai_version_id) ON DELETE SET NULL;
-- etc.

-- End of indexes and cleanup migration
