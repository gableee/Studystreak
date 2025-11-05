-- Migration: create material_ai_embeddings table, pointer columns, and indexes
-- Location: php-backend/migrations/2025_11_05_04_create_material_ai_embeddings.sql
-- Date: 2025-11-05
-- NOTE: Replace vector dimension (1536) with your embedding model's dimension.

BEGIN;

-- Enable pgvector extension (Supabase typically supports this)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table linking to material_ai_versions.ai_version_id
CREATE TABLE IF NOT EXISTS public.material_ai_embeddings (
  embedding_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_version_id uuid NOT NULL REFERENCES public.material_ai_versions(ai_version_id) ON DELETE CASCADE,
  vector vector(384), -- <- CHANGE this dimension to match your embedding model
  created_at timestamptz DEFAULT now()
);

-- Add optional pointer JSON to learning_materials for fast lookup of latest ai versions
ALTER TABLE public.learning_materials
  ADD COLUMN IF NOT EXISTS latest_ai_versions jsonb;

-- Add optional pointer on quizzes to record source ai_version used to generate the quiz
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS generated_from_ai_version_id uuid NULL;

-- Optional FK from quizzes to material_ai_versions for referential traceability
-- Add FK constraint only if it doesn't already exist (some PG versions don't support ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_quizzes_generated_from_ai_version'
  ) THEN
    ALTER TABLE public.quizzes
      ADD CONSTRAINT fk_quizzes_generated_from_ai_version
      FOREIGN KEY (generated_from_ai_version_id)
      REFERENCES public.material_ai_versions (ai_version_id)
      ON DELETE SET NULL;
  END IF;
END$$;

-- Basic index for joining/searching by ai_version_id
CREATE INDEX IF NOT EXISTS idx_material_ai_embeddings_ai_version_id
  ON public.material_ai_embeddings (ai_version_id);

-- Index for vector similarity (commented out by default — uncomment and tune when you have realistic data)
-- ivfflat requires choosing an appropriate 'lists' value and running ANALYZE/VACUUM
-- Uncomment the index creation below when ready and tune 'lists' for your dataset size
-- CREATE INDEX IF NOT EXISTS idx_material_ai_embeddings_vector_ivfflat
--   ON public.material_ai_embeddings USING ivfflat (vector vector_l2_ops)
--   WITH (lists = 100);

-- Create index to speed up latest-version queries
CREATE INDEX IF NOT EXISTS idx_material_ai_versions_material_type_created_at
  ON public.material_ai_versions (material_id, type, created_at DESC);

-- Enable Row Level Security on embeddings and create policies
ALTER TABLE public.material_ai_embeddings ENABLE ROW LEVEL SECURITY;

-- DROP existing policies if present, then create new ones (idempotent)
DROP POLICY IF EXISTS select_material_ai_embeddings ON public.material_ai_embeddings;
CREATE POLICY select_material_ai_embeddings ON public.material_ai_embeddings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.material_ai_versions mav
      JOIN public.learning_materials lm ON lm.material_id = mav.material_id
      WHERE mav.ai_version_id = public.material_ai_embeddings.ai_version_id
        AND (
          lm.is_public = true
          OR lm.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS insert_material_ai_embeddings ON public.material_ai_embeddings;
CREATE POLICY insert_material_ai_embeddings ON public.material_ai_embeddings
  FOR INSERT
  WITH CHECK (
    -- allow server/service-role to insert, or allow authenticated users (server can restrict further)
    auth.role() = 'service_role' OR auth.uid() IS NOT NULL
  );

COMMIT;

-- Rollback notes (for manual use):
-- To rollback manually run the inverse operations in a controlled window
-- DROP TABLE IF EXISTS public.material_ai_embeddings;
-- ALTER TABLE public.learning_materials DROP COLUMN IF EXISTS latest_ai_versions;
-- ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS fk_quizzes_generated_from_ai_version;
-- ALTER TABLE public.quizzes DROP COLUMN IF EXISTS generated_from_ai_version_id;

-- After bulk loading vectors and testing, you may want to create an ivfflat or hnsw index:
-- IVFFLAT (approximate nearest neighbor):
-- CREATE INDEX idx_material_ai_embeddings_vector_ivfflat
--   ON public.material_ai_embeddings USING ivfflat (vector vector_l2_ops)
--   WITH (lists = 100);

-- HNSW (if supported by your pgvector version):
-- CREATE INDEX idx_material_ai_embeddings_vector_hnsw
--   ON public.material_ai_embeddings USING hnsw (vector);
