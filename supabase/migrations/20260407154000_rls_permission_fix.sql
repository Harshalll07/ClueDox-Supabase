-- SUPABASE RLS POLICY FIX (Error 42501)
-- Date: 2026-04-07

-- 1. Enable RLS on all tables (Safety Check)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_folders ENABLE ROW LEVEL SECURITY;

-- 2. TEAM_MEMBERS POLICIES
-- Allow users to see who else is in their team
DROP POLICY IF EXISTS "Users can view fellow team members" ON public.team_members;
CREATE POLICY "Users can view fellow team members" ON public.team_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members AS self
    WHERE self.team_id = team_members.team_id 
    AND self.user_id = auth.uid()
  )
);

-- Allow users to add themselves to a team (Required for Team Creation flow)
DROP POLICY IF EXISTS "Users can insert their own membership" ON public.team_members;
CREATE POLICY "Users can insert their own membership" ON public.team_members
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Allow admins/owners to add others
DROP POLICY IF EXISTS "Admins can manage members" ON public.team_members;
CREATE POLICY "Admins can manage members" ON public.team_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.team_members AS self
    WHERE self.team_id = team_members.team_id 
    AND self.user_id = auth.uid()
    AND self.role IN ('owner', 'admin')
  )
);

-- 3. TEAMS POLICIES
-- Allow users to see teams they belong to
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
CREATE POLICY "Users can view their teams" ON public.teams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = teams.id 
    AND team_members.user_id = auth.uid()
  )
);

-- Allow any authenticated user to create a team
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams" ON public.teams
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- 4. NOTIFICATIONS RLS (Bonus stabilization)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (true); -- Usually inserted by Edge Functions/Triggers or app logic
