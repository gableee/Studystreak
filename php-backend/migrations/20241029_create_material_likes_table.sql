-- Migration: Create material_likes table to track user likes
-- This enables proper like/unlike functionality with user tracking

-- Create material_likes table
CREATE TABLE IF NOT EXISTS public.material_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.learning_materials(material_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one like per user per material
  UNIQUE(material_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_material_likes_material_id ON public.material_likes(material_id);
CREATE INDEX IF NOT EXISTS idx_material_likes_user_id ON public.material_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_material_likes_created_at ON public.material_likes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.material_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for material_likes

-- Policy: Users can view all likes (for counting)
CREATE POLICY "Anyone can view likes"
  ON public.material_likes
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert their own likes
CREATE POLICY "Users can like materials"
  ON public.material_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own likes
CREATE POLICY "Users can unlike their own likes"
  ON public.material_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.material_likes TO authenticated;
GRANT SELECT ON public.material_likes TO anon;

-- Optional: Add a trigger to keep likes_count in sync (for denormalization)
-- This is a performance optimization to avoid counting likes on every query

CREATE OR REPLACE FUNCTION public.sync_material_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.learning_materials
    SET likes_count = likes_count + 1
    WHERE material_id = NEW.material_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.learning_materials
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE material_id = OLD.material_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for insert and delete
DROP TRIGGER IF EXISTS trigger_material_like_insert ON public.material_likes;
CREATE TRIGGER trigger_material_like_insert
  AFTER INSERT ON public.material_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_material_likes_count();

DROP TRIGGER IF EXISTS trigger_material_like_delete ON public.material_likes;
CREATE TRIGGER trigger_material_like_delete
  AFTER DELETE ON public.material_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_material_likes_count();

COMMENT ON TABLE public.material_likes IS 'Tracks which users have liked which learning materials';
COMMENT ON COLUMN public.material_likes.material_id IS 'Reference to the learning material';
COMMENT ON COLUMN public.material_likes.user_id IS 'UUID of the user who liked the material';
COMMENT ON COLUMN public.material_likes.created_at IS 'When the like was recorded';
