-- MIGRATION: Fix PGRST200, Implement Nested Folders, and Scaling Optimizations

-- ==============================================================================
-- PART 1: FIX POLYMORPHIC SHARING (PGRST200)
-- ==============================================================================

-- Drop the problematic polymorphic table
DROP TABLE IF EXISTS public.shared_resources CASCADE;

-- Create explicit shared_files table
CREATE TABLE public.shared_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    shared_with_user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE, -- Null means shared with whole team
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(file_id, team_id, shared_with_user_id)
);

-- Create explicit shared_folders table
CREATE TABLE public.shared_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id UUID REFERENCES public.team_folders(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    shared_with_user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE, -- Null means shared with whole team
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(folder_id, team_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_files
CREATE POLICY "Team members can view shared files" ON public.shared_files FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = shared_files.team_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = shared_files.team_id AND owner_id = auth.uid())
);
CREATE POLICY "Team admins can manage shared files" ON public.shared_files FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = shared_files.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin')) OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = shared_files.team_id AND owner_id = auth.uid())
);

-- RLS Policies for shared_folders
CREATE POLICY "Team members can view shared folders" ON public.shared_folders FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = shared_folders.team_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = shared_folders.team_id AND owner_id = auth.uid())
);
CREATE POLICY "Team admins can manage shared folders" ON public.shared_folders FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = shared_folders.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin')) OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = shared_folders.team_id AND owner_id = auth.uid())
);


-- ==============================================================================
-- PART 2: IMPLEMENT NESTED FOLDERS
-- ==============================================================================

-- Add parent_folder_id to user_folders
ALTER TABLE public.user_folders ADD COLUMN IF NOT EXISTS parent_folder_id UUID REFERENCES public.user_folders(id) ON DELETE CASCADE;

-- Add parent_folder_id to team_folders
ALTER TABLE public.team_folders ADD COLUMN IF NOT EXISTS parent_folder_id UUID REFERENCES public.team_folders(id) ON DELETE CASCADE;

-- Create indexes for hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_user_folders_parent ON public.user_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_team_folders_parent ON public.team_folders(parent_folder_id);


-- ==============================================================================
-- PART 3: SCALING OPTIMIZATIONS (500GB / USER)
-- ==============================================================================

-- 1. Vector Search Index (HNSW)
-- Provides fast semantic search at large scales
CREATE INDEX IF NOT EXISTS idx_files_embedding ON public.files USING hnsw (embedding vector_cosine_ops);

-- 2. Performance Indexes for high traffic
CREATE INDEX IF NOT EXISTS idx_files_user_updated ON public.files(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_team_user ON public.team_members(team_id, user_id);

-- 3. Search Vector optimization
-- Add a generated trigger for search_vector if missing, or index it
CREATE INDEX IF NOT EXISTS idx_files_fts ON public.files USING GIN (to_tsvector('english', file_name));

-- Reload schema for PostgREST
NOTIFY pgrst, 'reload schema';
