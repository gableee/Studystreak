-- Fix RLS policies for learning_materials table
-- This script addresses the issue where a restrictive policy denies all operations including SELECT for non-admins

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public can view learning materials" ON learning_materials;
DROP POLICY IF EXISTS "Only admins can modify learning materials" ON learning_materials;
DROP POLICY IF EXISTS "select_owner_or_public" ON learning_materials;
DROP POLICY IF EXISTS "insert_owner" ON learning_materials;
DROP POLICY IF EXISTS "update_owner" ON learning_materials;
DROP POLICY IF EXISTS "delete_owner" ON learning_materials;
DROP POLICY IF EXISTS "Users can update their own materials" ON learning_materials;
DROP POLICY IF EXISTS "Users can delete their own materials" ON learning_materials;
DROP POLICY IF EXISTS "public_select" ON learning_materials;
DROP POLICY IF EXISTS "owner_full_access" ON learning_materials;
DROP POLICY IF EXISTS "admin_access" ON learning_materials;
DROP POLICY IF EXISTS "Anyone can read public materials" ON learning_materials;
DROP POLICY IF EXISTS "Users can read their own materials" ON learning_materials;
DROP POLICY IF EXISTS "Users can insert their own materials" ON learning_materials;

-- Drop existing admin policies that reference auth.users
DROP POLICY IF EXISTS "Admins can modify all materials" ON learning_materials;
DROP POLICY IF EXISTS "Admins can manage all likes" ON learning_material_likes;

-- Create permissive policies for reading public materials and own materials
-- Allow anyone to SELECT public materials
CREATE POLICY "Anyone can read public materials" ON learning_materials
    FOR SELECT
    USING (is_public = true AND deleted_at IS NULL);

-- Allow authenticated users to read their own materials
CREATE POLICY "Users can read own materials" ON learning_materials
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow admins to modify all materials (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can modify all materials" ON learning_materials
    FOR ALL
    USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
        OR (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role') = 'admin'
        OR (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role') = 'admin'
    );

-- Allow users to insert their own materials
CREATE POLICY "Users can insert own materials" ON learning_materials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own materials
CREATE POLICY "Users can update own materials" ON learning_materials
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own materials
CREATE POLICY "Users can delete own materials" ON learning_materials
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for learning_material_likes table
CREATE POLICY "Users can read likes" ON learning_material_likes
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own likes" ON learning_material_likes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON learning_material_likes
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all likes" ON learning_material_likes
    FOR ALL
    USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
        OR (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role') = 'admin'
        OR (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role') = 'admin'
    );

-- Note: The above policies should allow:
-- - All users (including unauthenticated) to read public materials
-- - Authenticated users to read their own materials
-- - Authenticated users to create, update, delete their own materials
-- - Admins to perform all operations on all materials
-- - Users to manage their own likes