-- DRIVE PERMISSIONS & RECURSIVE FOLDERS
-- Date: 2026-04-07

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. ENHANCE EXISTING TABLES
-- Add recursive structure and public access to team_folders
ALTER TABLE public.team_folders 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.team_folders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add AI analysis and vector embeddings to files, and the folder relationship
ALTER TABLE public.files 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS embedding VECTOR(1536),
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.team_folders(id) ON DELETE CASCADE;

-- CREATE INDEX for recursive lookups
CREATE INDEX IF NOT EXISTS idx_team_folders_parent_id ON public.team_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files(folder_id);

-- 3. UNIFIED PERMISSIONS TABLE
-- Drops the old specific tables to unify them
DROP TABLE IF EXISTS public.shared_files CASCADE;
DROP TABLE IF EXISTS public.shared_folders CASCADE;

CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.team_folders(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE, -- Team-wide override
  role TEXT CHECK (role IN ('viewer', 'editor', 'admin', 'owner')) DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Ensure a user doesn't have double permissions on the same item
  CONSTRAINT unique_user_folder UNIQUE(user_id, folder_id),
  CONSTRAINT unique_user_file UNIQUE(user_id, file_id),
  -- Resource check: Perm must target EITHER folder or file, or be a team-wide default
  CONSTRAINT resource_exists CHECK (
    (folder_id IS NOT NULL) OR (file_id IS NOT NULL) OR (team_id IS NOT NULL)
  )
);

-- 4. INITIAL MIGRATION (Move existing team members to permissions)
INSERT INTO public.permissions (team_id, user_id, role)
SELECT team_id, user_id, role FROM public.team_members
ON CONFLICT DO NOTHING;

-- 5. RECURSIVE ACCESS FUNCTION (Google Drive logic)
-- This function checks if a user has access to a folder by checking it and all its parents
CREATE OR REPLACE FUNCTION public.check_folder_access(target_folder_id UUID, target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_role TEXT;
    parent_uuid UUID;
BEGIN
    -- 1. Check direct permission on this folder
    SELECT role INTO current_role 
    FROM public.permissions 
    WHERE folder_id = target_folder_id AND user_id = target_user_id;
    
    IF current_role IS NOT NULL THEN
        RETURN current_role;
    END IF;

    -- 2. Check team-wide permission
    SELECT role INTO current_role 
    FROM public.permissions 
    WHERE team_id = (SELECT team_id FROM public.team_folders WHERE id = target_folder_id) 
    AND user_id = target_user_id;

    IF current_role IS NOT NULL THEN
        RETURN current_role;
    END IF;

    -- 3. Recursive check for parents
    SELECT parent_id INTO parent_uuid FROM public.team_folders WHERE id = target_folder_id;
    IF parent_uuid IS NOT NULL THEN
        RETURN public.check_folder_access(parent_uuid, target_user_id);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. SECURITY: RLS UPDATES
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their permissions" ON public.permissions
FOR SELECT USING (auth.uid() = user_id);

-- Refined team_folders policy
DROP POLICY IF EXISTS "Access via Team or Direct Share" ON public.team_folders;
CREATE POLICY "Access via Team or Direct Share" ON public.team_folders
FOR SELECT USING (
  public.check_folder_access(id, auth.uid()) IS NOT NULL OR is_public = true
);

-- Refined files policy for community sharing
DROP POLICY IF EXISTS "Resource Access Policy" ON public.files;
CREATE POLICY "Resource Access Policy" ON public.files
FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.permissions WHERE file_id = files.id AND user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.team_folders 
    WHERE team_folders.id = files.folder_id -- Assuming files link to team_folders
    AND public.check_folder_access(team_folders.id, auth.uid()) IS NOT NULL
  )
);

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
