-- Migration: Ensure quizzes.max_attempts exists and make it nullable (idempotent)
-- Purpose: Recover from accidental deletion of the column and enforce desired constraints.

DO $$
BEGIN
  -- If the column does not exist, add it with a sensible default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'max_attempts'
  ) THEN
    ALTER TABLE public.quizzes ADD COLUMN max_attempts integer DEFAULT 3;
  END IF;

  -- Remove NOT NULL if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'max_attempts' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.quizzes ALTER COLUMN max_attempts DROP NOT NULL;
  END IF;

  -- Drop default to avoid future implicit values (we want explicit control)
  ALTER TABLE public.quizzes ALTER COLUMN max_attempts DROP DEFAULT;

  -- Add check constraint for non-negative when present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'quizzes' AND c.conname = 'chk_quizzes_max_attempts_nonnegative'
  ) THEN
    ALTER TABLE public.quizzes ADD CONSTRAINT chk_quizzes_max_attempts_nonnegative CHECK (max_attempts IS NULL OR max_attempts >= 0);
  END IF;
END$$;

COMMENT ON COLUMN public.quizzes.max_attempts IS 'Null = unlimited attempts. When set, enforces maximum allowed attempts per user.';
