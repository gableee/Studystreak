-- SQL Snippet: Query patterns for reading latest AI artifacts (Option B)
-- Use these queries in your backend (PHP) and frontend to fetch the latest generated content.

-- 1) Fetch latest artifact of a specific type for a material (e.g., summary)
-- Fast single-row read:
-- TEMPLATE (replace the UUID below with a real material_id). Do NOT run the template literal
-- SELECT *
-- FROM public.material_ai_versions
-- WHERE material_id = '<MATERIAL_UUID>'::uuid
--   AND type = 'summary'
-- ORDER BY created_at DESC
-- LIMIT 1;

-- EXAMPLE (executable): replace the example UUID with one from your DB if you want to run this now
SELECT *
FROM public.material_ai_versions
WHERE material_id = '3f1a2b3c-1234-4d5e-8f00-0123456789ab'::uuid
  AND type = 'summary'
ORDER BY created_at DESC
LIMIT 1;

-- 2) Fetch latest artifacts for ALL types for a material (summary, keypoints, flashcards, quiz) in one query
-- Uses DISTINCT ON to get one row per type (the most recent):
-- TEMPLATE (replace the UUID below with a real material_id). Do NOT run the template literal
-- SELECT DISTINCT ON (type) 
--   ai_version_id, material_id, type, content, model_name, created_at
-- FROM public.material_ai_versions
-- WHERE material_id = '<MATERIAL_UUID>'::uuid
--   AND type IN ('summary', 'keypoints', 'flashcards', 'quiz')
-- ORDER BY type, created_at DESC;

-- EXAMPLE (executable):
SELECT DISTINCT ON (type)
  ai_version_id, material_id, type, content, model_name, created_at
FROM public.material_ai_versions
WHERE material_id = '3f1a2b3c-1234-4d5e-8f00-0123456789ab'::uuid
  AND type IN ('summary', 'keypoints', 'flashcards', 'quiz')
ORDER BY type, created_at DESC;

-- 3) Fetch version history for a specific type (e.g., all summary versions)
-- For showing "Previous versions" in UI:
-- TEMPLATE (replace the UUID below with a real material_id). Do NOT run the template literal
-- SELECT ai_version_id, content, model_name, created_at
-- FROM public.material_ai_versions
-- WHERE material_id = '<MATERIAL_UUID>'::uuid
--   AND type = 'summary'
-- ORDER BY created_at DESC
-- LIMIT 10;

-- EXAMPLE (executable):
SELECT ai_version_id, content, model_name, created_at
FROM public.material_ai_versions
WHERE material_id = '3f1a2b3c-1234-4d5e-8f00-0123456789ab'::uuid
  AND type = 'summary'
ORDER BY created_at DESC
LIMIT 10;

-- 4) Count how many artifacts exist per type for a material
-- TEMPLATE (replace the UUID below with a real material_id). Do NOT run the template literal
-- SELECT type, COUNT(*) AS version_count
-- FROM public.material_ai_versions
-- WHERE material_id = '<MATERIAL_UUID>'::uuid
-- GROUP BY type;

-- EXAMPLE (executable):
SELECT type, COUNT(*) AS version_count
FROM public.material_ai_versions
WHERE material_id = '3f1a2b3c-1234-4d5e-8f00-0123456789ab'::uuid
GROUP BY type;

-- 5) Check if any AI content exists for a material (boolean check)
-- TEMPLATE (replace the UUID below with a real material_id). Do NOT run the template literal
-- SELECT EXISTS (
--   SELECT 1 FROM public.material_ai_versions
--   WHERE material_id = '<MATERIAL_UUID>'::uuid
-- ) AS has_ai_content;

-- EXAMPLE (executable):
SELECT EXISTS (
  SELECT 1 FROM public.material_ai_versions
  WHERE material_id = '3f1a2b3c-1234-4d5e-8f00-0123456789ab'::uuid
) AS has_ai_content;

-- 6) Fetch all materials with their latest summary (JOIN pattern, useful for listings)
SELECT 
  lm.material_id,
  lm.title,
  lm.created_at,
  mav.content AS latest_summary
FROM public.learning_materials lm
LEFT JOIN LATERAL (
  SELECT content
  FROM public.material_ai_versions
  WHERE material_id = lm.material_id AND type = 'summary'
  ORDER BY created_at DESC
  LIMIT 1
) mav ON true
WHERE lm.deleted_at IS NULL
ORDER BY lm.created_at DESC
LIMIT 20;

-- End of query snippets
