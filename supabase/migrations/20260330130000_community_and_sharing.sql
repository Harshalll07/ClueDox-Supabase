-- MIGRATION: Community and Sharing Tables (Unified Nuclear Rebuild)
-- RUN THIS ENTIRE SCRIPT FROM TOP TO BOTTOM IN THE SUPABASE SQL EDITOR

-- ==============================================================================
-- STEP 1: UPGRADE EXISTING TABLES & CLEANUP
-- ==============================================================================

-- Upgrade shared_links table to support folders and roles
ALTER TABLE IF EXISTS public.shared_links ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE IF EXISTS public.shared_links ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer';
ALTER TABLE IF EXISTS public.shared_links ALTER COLUMN file_id DROP NOT NULL;

DROP TABLE IF EXISTS public.resource_shares CASCADE;
DROP TABLE IF EXISTS public.team_folder_files CASCADE;
DROP TABLE IF EXISTS public.team_folders CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;


-- ==============================================================================
-- STEP 2: CREATE TABLES CLEANLY
-- ==============================================================================

-- 1. Create `teams` (Communities) table
CREATE TABLE public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create `team_members` (Community Members) table
CREATE TABLE public.team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, user_id)
);

-- 3. Create `team_folders` table
CREATE TABLE public.team_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create `team_folder_files` mapping table
CREATE TABLE public.team_folder_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id UUID REFERENCES public.team_folders(id) ON DELETE CASCADE NOT NULL,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    added_by UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(folder_id, file_id)
);

-- 5. Create `resource_shares` (For Files and Folders direct sharing)
CREATE TABLE public.resource_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'folder')),
    shared_with_user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    sharer_user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(resource_id, resource_type, shared_with_user_id)
);


-- ==============================================================================
-- STEP 3: ENABLE RLS & ASSIGN SAFE POLICIES (No Recursion)
-- ==============================================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_folder_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_shares ENABLE ROW LEVEL SECURITY;

-- Teams
CREATE POLICY "Users can view teams they own or belong to" ON public.teams FOR SELECT USING (
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Team owners can update teams" ON public.teams FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Team owners can delete teams" ON public.teams FOR DELETE USING (owner_id = auth.uid());

-- Team Members
CREATE POLICY "Users can view members of their teams" ON public.team_members FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_members.team_id AND t.owner_id = auth.uid())
);
CREATE POLICY "Authenticated users can insert team members" ON public.team_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Team owners and admins can update members" ON public.team_members FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin'))
);
CREATE POLICY "Team owners and admins can delete members, or themselves" ON public.team_members FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin'))
);

-- Team Folders
CREATE POLICY "Users can view folders of their teams" ON public.team_folders FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_folders.team_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_folders.team_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can insert folders to their teams" ON public.team_folders FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_folders.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'member')) OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_folders.team_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can update team folders" ON public.team_folders FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_folders.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'member')) OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_folders.team_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can delete team folders" ON public.team_folders FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_folders.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin')) OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_folders.team_id AND owner_id = auth.uid())
);

-- Team Folder Files
CREATE POLICY "Users can view files in their team folders" ON public.team_folder_files FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_folders tf JOIN public.team_members tm ON tf.team_id = tm.team_id WHERE tf.id = team_folder_files.folder_id AND tm.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.team_folders tf JOIN public.teams t ON tf.team_id = t.id WHERE tf.id = team_folder_files.folder_id AND t.owner_id = auth.uid())
);
CREATE POLICY "Users can add files to their team folders" ON public.team_folder_files FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.team_folders tf JOIN public.team_members tm ON tf.team_id = tm.team_id WHERE tf.id = team_folder_files.folder_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin', 'member')) OR
    EXISTS (SELECT 1 FROM public.team_folders tf JOIN public.teams t ON tf.team_id = t.id WHERE tf.id = team_folder_files.folder_id AND t.owner_id = auth.uid())
);
CREATE POLICY "Users can delete files from team folders" ON public.team_folder_files FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.team_folders tf JOIN public.team_members tm ON tf.team_id = tm.team_id WHERE tf.id = team_folder_files.folder_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')) OR
    EXISTS (SELECT 1 FROM public.team_folders tf JOIN public.teams t ON tf.team_id = t.id WHERE tf.id = team_folder_files.folder_id AND t.owner_id = auth.uid())
);

-- Resource Shares
CREATE POLICY "Users can view shares they are involved in" ON public.resource_shares FOR SELECT USING (
    sharer_user_id = auth.uid() OR shared_with_user_id = auth.uid()
);
CREATE POLICY "Authenticated users can insert share records" ON public.resource_shares FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their share, or shares they created" ON public.resource_shares FOR UPDATE USING (sharer_user_id = auth.uid() OR (shared_with_user_id = auth.uid() AND role = 'editor'));
CREATE POLICY "Users can delete their share, or shares they created" ON public.resource_shares FOR DELETE USING (sharer_user_id = auth.uid());


-- Add policy to profiles to allow searching for invitations (only full_name and phone_number)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can search other profiles'
    ) THEN
        CREATE POLICY "Users can search other profiles" 
        ON public.profiles FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- ==============================================================================
-- STEP 4: RELOAD SUPABASE CACHE
-- Forces PostgREST API to recognize the new tables immediately, stopping all 404s.
-- ==============================================================================
NOTIFY pgrst, 'reload schema';

