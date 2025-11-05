-- Query snippets & templates for material_ai_embeddings and pointer updates
-- File: php-backend/migrations/QUERY_SNIPPETS_material_ai_embeddings.sql
-- Purpose: Developer copy/paste snippets for creating, inserting, and using embeddings

-- 1) TEMPLATE: Create pgvector extension + embeddings table
-- Replace VECTOR_DIM with your model's dimension (e.g. 1536, 3072)
-- NOTE: this is a template; we already have a migration file. Only run if you need a quick manual create.
--
-- CREATE EXTENSION IF NOT EXISTS vector;
--
-- CREATE TABLE IF NOT EXISTS public.material_ai_embeddings (
--   embedding_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   ai_version_id uuid NOT NULL REFERENCES public.material_ai_versions(ai_version_id) ON DELETE CASCADE,
--   vector vector(VECTOR_DIM),
--   created_at timestamptz DEFAULT now()
-- );

-- 2) Insert an embedding (example)
-- Use parameter binding from your app. This example shows the literal vector format for psql.
-- Replace <AI_VERSION_ID> and the vector values.
INSERT INTO public.material_ai_embeddings (ai_version_id, vector)
VALUES ('<AI_VERSION_ID>'::uuid, ARRAY[0.0123, -0.0045, 0.777, /* ... */]::vector);

-- 3) Update learning_materials.latest_ai_versions JSON pointer
-- Set or replace the 'summary' pointer to point to a new ai_version_id
-- This keeps a fast pointer to the latest ai artifact (optional).
UPDATE public.learning_materials
SET latest_ai_versions = jsonb_set(coalesce(latest_ai_versions, '{}'::jsonb), '{summary}', to_jsonb('<AI_VERSION_ID>'::text), true),
    updated_at = now()
WHERE material_id = '<MATERIAL_ID>'::uuid;

-- 4) Read the latest ai_version_id for a material+type (safe read using DISTINCT ON)
SELECT DISTINCT ON (type) ai_version_id, material_id, type, created_at
FROM public.material_ai_versions
WHERE material_id = '<MATERIAL_ID>'::uuid AND type = 'summary'
ORDER BY type, created_at DESC
LIMIT 1;

-- 5) Set quizzes.generated_from_ai_version_id when creating an auto-generated quiz
UPDATE public.quizzes
SET generated_from_ai_version_id = '<AI_VERSION_ID>'::uuid,
    updated_at = now()
WHERE quiz_id = '<QUIZ_ID>'::uuid;

-- 6) Example: join embeddings -> ai_versions -> materials to get content for nearest results
-- (When you implement search, generate a query vector p in the app and pass it as a parameter)
-- SELECT e.ai_version_id, v.material_id, v.type, v.content, lm.title
-- FROM public.material_ai_embeddings e
-- JOIN public.material_ai_versions v ON v.ai_version_id = e.ai_version_id
-- JOIN public.learning_materials lm ON lm.material_id = v.material_id
-- ORDER BY e.vector <=> :query_vector
-- LIMIT 10;

-- 7) RLS policy snippet for embeddings (example)
-- Adjust the logic to match your learning_materials visibility rules.
-- ENABLE RLS
-- ALTER TABLE public.material_ai_embeddings ENABLE ROW LEVEL SECURITY;

-- SELECT policy: owner or public
-- CREATE POLICY select_material_ai_embeddings ON public.material_ai_embeddings
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.material_ai_versions mav
--       JOIN public.learning_materials lm ON lm.material_id = mav.material_id
--       WHERE mav.ai_version_id = public.material_ai_embeddings.ai_version_id
--         AND (lm.is_public = true OR lm.user_id = auth.uid())
--     )
--   );

-- INSERT policy: service-role or server-side inserts only
-- CREATE POLICY insert_material_ai_embeddings ON public.material_ai_embeddings
--   FOR INSERT
--   WITH CHECK (auth.role() = 'service_role');

-- 8) Quick check: list number of embeddings per material
SELECT v.material_id, count(*) AS embeddings_count
FROM public.material_ai_embeddings e
JOIN public.material_ai_versions v ON v.ai_version_id = e.ai_version_id
GROUP BY v.material_id
ORDER BY embeddings_count DESC
LIMIT 50;

-- 9) Remove an embedding row (example)
DELETE FROM public.material_ai_embeddings WHERE embedding_id = '<EMBEDDING_ID>'::uuid;

-- End of snippets