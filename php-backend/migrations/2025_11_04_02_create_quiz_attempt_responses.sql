-- Migration: Create quiz_attempt_responses table
-- Purpose: Store per-question responses for quiz attempts to enable analytics and history

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.quiz_attempt_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(attempt_id) ON DELETE CASCADE,
  question_id uuid NULL REFERENCES public.quiz_questions(question_id),
  answer jsonb NOT NULL,
  is_correct boolean NULL,
  response_time_ms integer NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_responses_attempt_id ON public.quiz_attempt_responses (attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_responses_question_id ON public.quiz_attempt_responses (question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_responses_created_at ON public.quiz_attempt_responses (created_at DESC);

COMMENT ON TABLE public.quiz_attempt_responses IS 'Per-question responses for quiz attempts (answers, correctness, time).';
