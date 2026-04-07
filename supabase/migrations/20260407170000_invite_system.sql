-- INVITATION SYSTEM & NESTED DRIVE SECURITY
-- Date: 2026-04-07

-- 1. SCHEMA ALIGNMENT
-- Add community flag to files for easier filtering
ALTER TABLE public.files 
ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT false;

-- 2. USER LOOKUP FUNCTION (SECURITY DEFINER)
-- Bridges the gap between public schema and auth.users
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_text TEXT)
RETURNS UUID AS $$
DECLARE
    found_user_id UUID;
BEGIN
    SELECT id INTO found_user_id FROM auth.users WHERE email = email_text;
    RETURN found_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PERMISSIONS POLICIES
-- Allow Admins and Owners to invite others
DROP POLICY IF EXISTS "Admins can invite/add users" ON public.permissions;
CREATE POLICY "Admins can invite/add users" ON public.permissions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = (
        -- Get the team_id from the folder being shared
        SELECT team_id FROM public.team_folders WHERE id = folder_id
    )
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('admin', 'owner')
  )
);

-- 4. FILE UPLOAD POLICIES
-- Allow users with editor/admin role in a folder to upload files
DROP POLICY IF EXISTS "Users can upload to shared folders" ON public.files;
CREATE POLICY "Users can upload to shared folders" ON public.files
FOR INSERT WITH CHECK (
  is_community = false OR -- Allow personal uploads
  EXISTS (
    SELECT 1 FROM public.permissions 
    WHERE folder_id = files.folder_id 
    AND user_id = auth.uid() 
    AND role IN ('editor', 'admin', 'owner')
  )
);

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
