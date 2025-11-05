-- Migration: Row Level Security (RLS) policies for learning_materials and related tables
-- Purpose: Ensure private materials are only accessible to owners and public materials are readable by anyone.
-- Notes: Service-role key bypasses RLS. Admin/service-role operations should use service-role API keys.

ALTER TABLE IF EXISTS public.learning_materials ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for public materials or owner (service role allowed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'learning_materials' AND p.policyname = 'learning_materials_select_public_or_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY learning_materials_select_public_or_owner ON public.learning_materials
        FOR SELECT
        USING ((is_public = true) OR (user_id = auth.uid()) OR (auth.role() = 'service_role'));
    $policy$;
  END IF;
END$$;

-- Allow INSERT only when requester sets user_id = auth.uid() (or service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'learning_materials' AND p.policyname = 'learning_materials_insert_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY learning_materials_insert_owner ON public.learning_materials
        FOR INSERT
        WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');
    $policy$;
  END IF;
END$$;

-- Allow UPDATE only for owner or service role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'learning_materials' AND p.policyname = 'learning_materials_update_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY learning_materials_update_owner ON public.learning_materials
        FOR UPDATE
        USING (user_id = auth.uid() OR auth.role() = 'service_role')
        WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');
    $policy$;
  END IF;
END$$;

-- Allow DELETE only for owner or service role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'learning_materials' AND p.policyname = 'learning_materials_delete_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY learning_materials_delete_owner ON public.learning_materials
        FOR DELETE
        USING (user_id = auth.uid() OR auth.role() = 'service_role');
    $policy$;
  END IF;
END$$;

-- Policies for material_ai_versions: read allowed if underlying material is public or requester is owner (or service role)
ALTER TABLE IF EXISTS public.material_ai_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'material_ai_versions' AND p.policyname = 'material_ai_versions_select_public_or_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY material_ai_versions_select_public_or_owner ON public.material_ai_versions
        FOR SELECT
        USING (
          (auth.role() = 'service_role') OR
          EXISTS (
            SELECT 1 FROM public.learning_materials m
            WHERE m.material_id = material_ai_versions.material_id
              AND (m.is_public = true OR m.user_id = auth.uid())
          )
        );
    $policy$;
  END IF;
END$$;

-- Allow INSERT to material_ai_versions only if requester is owner of the referenced material or service role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'material_ai_versions' AND p.policyname = 'material_ai_versions_insert_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY material_ai_versions_insert_owner ON public.material_ai_versions
        FOR INSERT
        WITH CHECK (
          auth.role() = 'service_role' OR
          EXISTS (
            SELECT 1 FROM public.learning_materials m
            WHERE m.material_id = material_id
              AND m.user_id = auth.uid()
          )
        );
    $policy$;
  END IF;
END$$;

-- For quiz_attempt_responses: allow inserts only if the attempt belongs to the current user or service role
ALTER TABLE IF EXISTS public.quiz_attempt_responses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'quiz_attempt_responses' AND p.policyname = 'quiz_attempt_responses_insert_attempt_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY quiz_attempt_responses_insert_attempt_owner ON public.quiz_attempt_responses
        FOR INSERT
        WITH CHECK (
          auth.role() = 'service_role' OR
          EXISTS (
            SELECT 1 FROM public.quiz_attempts a
            WHERE a.attempt_id = attempt_id
              AND a.user_id = auth.uid()
          )
        );
    $policy$;
  END IF;
END$$;

-- Allow SELECT for responses only to the owner of the attempt or to the service role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'quiz_attempt_responses' AND p.policyname = 'quiz_attempt_responses_select_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY quiz_attempt_responses_select_owner ON public.quiz_attempt_responses
        FOR SELECT
        USING (
          auth.role() = 'service_role' OR
          EXISTS (
            SELECT 1 FROM public.quiz_attempts a
            WHERE a.attempt_id = quiz_attempt_responses.attempt_id
              AND a.user_id = auth.uid()
          )
        );
    $policy$;
  END IF;
END$$;

-- Admin and service-role will bypass these policies when using service role key.

-- Helpful indexes for the policy joins
CREATE INDEX IF NOT EXISTS idx_learning_materials_user_id ON public.learning_materials (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_attempt_id_user_id ON public.quiz_attempts (attempt_id, user_id);

-- End of RLS policies migration
