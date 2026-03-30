
-- User folders table (replaces localStorage)
CREATE TABLE public.user_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.user_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own folders" ON public.user_folders
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Folder-file associations
CREATE TABLE public.user_folder_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.user_folders(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(folder_id, file_id)
);

ALTER TABLE public.user_folder_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own folder files" ON public.user_folder_files
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_folders WHERE id = folder_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_folders WHERE id = folder_id AND user_id = auth.uid()));
