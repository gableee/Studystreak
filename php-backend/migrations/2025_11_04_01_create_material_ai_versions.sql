-- Migration: Create material_ai_versions table
-- Purpose: Store versioned AI-generated content (summary, keypoints, quiz, flashcards)

-- Ensure pgcrypto is available for gen_random_uuid(). Supabase/Postgres commonly provides this.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.material_ai_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id uuid NOT NULL REFERENCES public.learning_materials(material_id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('summary', 'keypoints', 'quiz', 'flashcards')),
  content jsonb NOT NULL,
  model_name text NULL,
  model_params jsonb NULL,
  generated_by text NULL, -- e.g. 'system' or user id
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_material_ai_versions_material_type ON public.material_ai_versions (material_id, type);
CREATE INDEX IF NOT EXISTS idx_material_ai_versions_created_at ON public.material_ai_versions (created_at DESC);
-- GIN index for jsonb content search if needed
CREATE INDEX IF NOT EXISTS idx_material_ai_versions_content_gin ON public.material_ai_versions USING GIN (content jsonb_path_ops);

-- Optional: grant minimal permissions to authenticated role can be handled by RLS policies separate migration

COMMENT ON TABLE public.material_ai_versions IS 'Versioned AI-generated outputs for learning materials (for auditing and history).';
