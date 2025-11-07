-- Migration: Make quizzes.max_attempts nullable to allow unlimited attempts
-- Purpose: Allow NULL to indicate unlimited attempts. Enforce limits in application logic when non-null.

ALTER TABLE IF EXISTS public.quizzes
  ALTER COLUMN max_attempts DROP DEFAULT;

-- If the column is declared NOT NULL, allow NULL values
ALTER TABLE IF EXISTS public.quizzes
  ALTER COLUMN max_attempts DROP NOT NULL;

-- Optionally, set CHECK constraint to ensure non-negative values when set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'quizzes' AND c.conname = 'chk_quizzes_max_attempts_nonnegative'
  ) THEN
    ALTER TABLE public.quizzes ADD CONSTRAINT chk_quizzes_max_attempts_nonnegative CHECK (max_attempts IS NULL OR max_attempts >= 0);
  END IF;
END$$;

COMMENT ON COLUMN public.quizzes.max_attempts IS 'Null = unlimited attempts. When set, enforces maximum allowed attempts per user.';
