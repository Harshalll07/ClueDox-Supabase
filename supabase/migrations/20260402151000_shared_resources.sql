-- MIGRATION: Shared Resources Table
-- This table allows sharing files/folders with entire communities or specific members.

CREATE TABLE IF NOT EXISTS public.shared_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'folder')),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    shared_with_user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE, -- Null means shared with whole team
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(resource_id, resource_type, team_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Anyone in the team can view resources shared with the team or them specifically
CREATE POLICY "Team members can view shared resources" ON public.shared_resources
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = shared_resources.team_id AND user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = shared_resources.team_id AND owner_id = auth.uid()
    )
);

-- 2. Owners and Admins of the team can share resources
CREATE POLICY "Team admins can share resources" ON public.shared_resources
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = shared_resources.team_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    ) OR
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = shared_resources.team_id AND owner_id = auth.uid()
    )
);

-- 3. Team admins can update/delete sharing records
CREATE POLICY "Team admins can manage shared resources" ON public.shared_resources
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = shared_resources.team_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    ) OR
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = shared_resources.team_id AND owner_id = auth.uid()
    )
);

CREATE POLICY "Team admins can delete shared resources" ON public.shared_resources
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = shared_resources.team_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    ) OR
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = shared_resources.team_id AND owner_id = auth.uid()
    )
);

-- Reload schema
NOTIFY pgrst, 'reload schema';
