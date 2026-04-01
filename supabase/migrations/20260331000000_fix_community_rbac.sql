    -- 1. FORCE-DROP ALL POLICIES FIRST (Extreme Defensive Mode)
    
    -- Table: teams
    DROP POLICY IF EXISTS "Users can view teams they own or belong to" ON public.teams;
    DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
    DROP POLICY IF EXISTS "Owners can update teams" ON public.teams;
    
    -- Table: team_members
    DROP POLICY IF EXISTS "Users can view members of their teams" ON public.team_members;
    DROP POLICY IF EXISTS "Authenticated users can insert team members" ON public.team_members;
    DROP POLICY IF EXISTS "Team owners and admins can update members" ON public.team_members;
    DROP POLICY IF EXISTS "Team owners and admins can delete members, or themselves" ON public.team_members;
    
    -- Table: team_folders
    DROP POLICY IF EXISTS "Users can view folders of their teams" ON public.team_folders;
    DROP POLICY IF EXISTS "Users can delete team folders" ON public.team_folders;
    DROP POLICY IF EXISTS "Users can update team folders" ON public.team_folders;
    DROP POLICY IF EXISTS "Authenticated users can create team folders" ON public.team_folders;

    -- Table: team_folder_files
    DROP POLICY IF EXISTS "Users can view files in their team folders" ON public.team_folder_files;
    DROP POLICY IF EXISTS "Users can add files to their team folders" ON public.team_folder_files;
    DROP POLICY IF EXISTS "Users can delete files from team folders" ON public.team_folder_files;

    -- 2. NOW DROP THE FUNCTIONS (Unlocked by the drops above)
    DROP FUNCTION IF EXISTS public.is_team_member(UUID, UUID);
    DROP FUNCTION IF EXISTS public.is_team_admin(UUID, UUID);

    -- 3. RECREATE FUNCTIONS (Security Definer to break recursion)
    CREATE OR REPLACE FUNCTION public.is_team_member(t_id UUID, u_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
        RETURN EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE team_id = t_id AND user_id = u_id
        );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION public.is_team_admin(t_id UUID, u_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
        -- Check team ownership directly from the teams table
        IF EXISTS (SELECT 1 FROM public.teams WHERE id = t_id AND owner_id = u_id) THEN
            RETURN TRUE;
        END IF;

        -- Check admin/owner role in team_members
        RETURN EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE team_id = t_id 
            AND user_id = u_id 
            AND role IN ('owner', 'admin')
        );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 4. REBUILD ALL POLICIES FROM SCRATCH

    -- Table: teams
    CREATE POLICY "Users can view teams they own or belong to" ON public.teams FOR SELECT USING (
        owner_id = auth.uid() OR 
        public.is_team_member(id, auth.uid())
    );

    -- Table: team_members
    CREATE POLICY "Users can view members of their teams" ON public.team_members FOR SELECT USING (
        user_id = auth.uid() OR
        public.is_team_member(team_id, auth.uid()) OR
        EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid())
    );

    CREATE POLICY "Authenticated users can insert team members" ON public.team_members FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND role != 'owner'
    );

    CREATE POLICY "Team owners and admins can update members" ON public.team_members FOR UPDATE USING (
        public.is_team_admin(team_id, auth.uid())
    );

    CREATE POLICY "Team owners and admins can delete members, or themselves" ON public.team_members FOR DELETE USING (
        user_id = auth.uid() OR
        public.is_team_admin(team_id, auth.uid())
    );

    -- Table: team_folders
    CREATE POLICY "Users can view folders of their teams" ON public.team_folders FOR SELECT USING (
        created_by = auth.uid() OR
        public.is_team_member(team_id, auth.uid()) OR
        EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid())
    );

    CREATE POLICY "Users can delete team folders" ON public.team_folders FOR DELETE USING (
        public.is_team_admin(team_id, auth.uid())
    );

    CREATE POLICY "Users can update team folders" ON public.team_folders FOR UPDATE USING (
        public.is_team_member(team_id, auth.uid()) OR
        EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid())
    );

    -- Table: team_folder_files
    CREATE POLICY "Users can view files in their team folders" ON public.team_folder_files FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_folders tf WHERE tf.id = folder_id AND tf.created_by = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.team_folders tf JOIN public.teams t ON tf.team_id = t.id WHERE tf.id = folder_id AND t.owner_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.team_folders tf WHERE tf.id = folder_id AND public.is_team_member(tf.team_id, auth.uid()))
    );

    CREATE POLICY "Users can add files to their team folders" ON public.team_folder_files FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.team_folders tf WHERE tf.id = folder_id AND (
            public.is_team_member(tf.team_id, auth.uid()) OR 
            EXISTS (SELECT 1 FROM public.teams t WHERE t.id = tf.team_id AND t.owner_id = auth.uid())
        ))
    );

    CREATE POLICY "Users can delete files from team folders" ON public.team_folder_files FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.team_folders tf WHERE tf.id = folder_id AND (
            public.is_team_admin(tf.team_id, auth.uid()) OR
            EXISTS (SELECT 1 FROM public.teams t WHERE t.id = tf.team_id AND t.owner_id = auth.uid())
        ))
    );

    -- Notify schema change
    NOTIFY pgrst, 'reload schema';
