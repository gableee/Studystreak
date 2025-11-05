-- Migration: Backfill existing ai_* columns from learning_materials into material_ai_versions
-- Purpose: Preserve existing AI-generated data before dropping ai_* columns from learning_materials.
-- This is a safe, non-destructive migration. Run in staging first.

-- Step 1: Backfill ai_summary into material_ai_versions (type='summary')
INSERT INTO public.material_ai_versions (material_id, type, content, model_name, model_params, generated_by, created_at)
SELECT 
  material_id,
  'summary' AS type,
  jsonb_build_object(
    'text', ai_summary,
    'source', 'legacy_migration'
  ) AS content,
  'unknown' AS model_name,
  jsonb_build_object('migrated', true) AS model_params,
  'migration' AS generated_by,
  COALESCE(ai_generated_at, created_at) AS created_at
FROM public.learning_materials
WHERE ai_summary IS NOT NULL AND ai_summary <> ''
ON CONFLICT DO NOTHING;

-- Step 2: Backfill ai_keypoints into material_ai_versions (type='keypoints')
INSERT INTO public.material_ai_versions (material_id, type, content, model_name, model_params, generated_by, created_at)
SELECT 
  material_id,
  'keypoints' AS type,
  CASE 
    WHEN jsonb_typeof(ai_keypoints) = 'array' THEN ai_keypoints
    ELSE jsonb_build_object('keypoints', ai_keypoints, 'source', 'legacy_migration')
  END AS content,
  'unknown' AS model_name,
  jsonb_build_object('migrated', true) AS model_params,
  'migration' AS generated_by,
  COALESCE(ai_generated_at, created_at) AS created_at
FROM public.learning_materials
WHERE ai_keypoints IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 3: Backfill ai_quiz into material_ai_versions (type='quiz')
INSERT INTO public.material_ai_versions (material_id, type, content, model_name, model_params, generated_by, created_at)
SELECT 
  material_id,
  'quiz' AS type,
  CASE 
    WHEN jsonb_typeof(ai_quiz) = 'object' THEN ai_quiz
    ELSE jsonb_build_object('quiz', ai_quiz, 'source', 'legacy_migration')
  END AS content,
  'unknown' AS model_name,
  jsonb_build_object('migrated', true) AS model_params,
  'migration' AS generated_by,
  COALESCE(ai_generated_at, created_at) AS created_at
FROM public.learning_materials
WHERE ai_quiz IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 4: Backfill ai_flashcards into material_ai_versions (type='flashcards')
INSERT INTO public.material_ai_versions (material_id, type, content, model_name, model_params, generated_by, created_at)
SELECT 
  material_id,
  'flashcards' AS type,
  CASE 
    WHEN jsonb_typeof(ai_flashcards) = 'array' THEN jsonb_build_object('cards', ai_flashcards)
    ELSE jsonb_build_object('flashcards', ai_flashcards, 'source', 'legacy_migration')
  END AS content,
  'unknown' AS model_name,
  jsonb_build_object('migrated', true) AS model_params,
  'migration' AS generated_by,
  COALESCE(ai_generated_at, created_at) AS created_at
FROM public.learning_materials
WHERE ai_flashcards IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verification query: count backfilled rows
-- Run this after migration to confirm backfill succeeded:
-- SELECT type, COUNT(*) FROM material_ai_versions WHERE generated_by = 'migration' GROUP BY type;

-- End of backfill migration
