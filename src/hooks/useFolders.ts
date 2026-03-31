import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserFolder {
  id: string;
  name: string;
  fileIds: string[];
}

async function fetchFolders(): Promise<UserFolder[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get folders owned by user
  const { data: ownedFolders, error: ownedError } = await supabase
    .from("user_folders")
    .select("id, name")
    .eq("user_id", user.id);

  if (ownedError) throw ownedError;

  // Get folders shared with user
  const { data: sharedShares, error: sharedError } = await supabase
    .from("resource_shares" as any)
    .select("resource_id")
    .eq("shared_with_user_id", user.id)
    .eq("resource_type", "folder");

  if (sharedError) throw sharedError;

  const sharedIds = (sharedShares || []).map(s => (s as any).resource_id);
  
  let folders = ownedFolders || [];
  
  if (sharedIds.length > 0) {
    const { data: sharedFolders, error: sharedFoldersError } = await supabase
      .from("user_folders")
      .select("id, name")
      .in("id", sharedIds);
    
    if (!sharedFoldersError && sharedFolders) {
      // Avoid duplicates
      const ownedIds = new Set(folders.map(f => f.id));
      const filteredShared = sharedFolders.filter(sf => !ownedIds.has(sf.id));
      folders = [...folders, ...filteredShared];
    }
  }

  if (folders.length === 0) return [];

  const folderIds = folders.map((f) => f.id);
  const { data: folderFiles } = await supabase
    .from("user_folder_files")
    .select("folder_id, file_id")
    .in("folder_id", folderIds);

  const fileMap = new Map<string, string[]>();
  for (const ff of folderFiles || []) {
    if (!fileMap.has(ff.folder_id)) fileMap.set(ff.folder_id, []);
    fileMap.get(ff.folder_id)!.push(ff.file_id);
  }

  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    fileIds: fileMap.get(f.id) || [],
  }));
}

export function useFolders() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-folders"],
    queryFn: fetchFolders,
  });

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_folders")
        .insert({ name, user_id: session.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-folders"] });
      toast.success("Folder created");
    },
    onError: () => toast.error("Failed to create folder"),
  });

  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase.from("user_folders").delete().eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-folders"] });
      toast.success("Folder deleted");
    },
    onError: () => toast.error("Failed to delete folder"),
  });

  const renameFolder = useMutation({
    mutationFn: async ({ folderId, newName }: { folderId: string; newName: string }) => {
      const { error } = await supabase
        .from("user_folders")
        .update({ name: newName })
        .eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-folders"] });
      toast.success("Folder renamed");
    },
    onError: () => toast.error("Failed to rename folder"),
  });

  const addFileToFolder = useMutation({
    mutationFn: async ({ folderId, fileId }: { folderId: string; fileId: string }) => {
      const { error } = await supabase
        .from("user_folder_files")
        .insert({ folder_id: folderId, file_id: fileId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-folders"] });
      toast.success("File added to folder");
    },
    onError: () => toast.error("Failed to add file"),
  });

  const removeFileFromFolder = useMutation({
    mutationFn: async ({ folderId, fileId }: { folderId: string; fileId: string }) => {
      const { error } = await supabase
        .from("user_folder_files")
        .delete()
        .eq("folder_id", folderId)
        .eq("file_id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-folders"] });
      toast.success("File removed from folder");
    },
    onError: () => toast.error("Failed to remove file"),
  });

  return {
    folders: query.data || [],
    isLoading: query.isLoading,
    createFolder,
    deleteFolder,
    renameFolder,
    addFileToFolder,
    removeFileFromFolder,
  };
}
