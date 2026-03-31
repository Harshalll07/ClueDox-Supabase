import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ResourceRole = "owner" | "editor" | "viewer";

export interface ResourceShare {
  id: string;
  resource_id: string;
  resource_type: "file" | "folder";
  shared_with_user_id: string;
  sharer_user_id: string;
  role: ResourceRole;
  created_at: string;
  profiles?: {
    full_name: string;
    id: string;
  };
  resource_name?: string;
}

export function useSharing(resourceId?: string, resourceType: "file" | "folder" = "folder", ownerId?: string) {
  const queryClient = useQueryClient();

  // Fetch all collaborators for a specific resource
  const collaboratorsQuery = useQuery({
    queryKey: ["resource-shares", resourceId],
    enabled: !!resourceId,
    queryFn: async (): Promise<ResourceShare[]> => {
      const { data, error } = await supabase
        .from("resource_shares" as any)
        .select("*, profiles:shared_with_user_id(id, full_name)")
        .eq("resource_id", resourceId);

      if (error) throw error;
      return (data as any) as ResourceShare[];
    },
  });

  const collaborators = collaboratorsQuery.data || [];

  // Fetch "Shared with me" resources
  const sharedWithMeQuery = useQuery({
    queryKey: ["shared-with-me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("resource_shares" as any)
        .select("*")
        .eq("shared_with_user_id", user.id);

      if (error) throw error;
      
      const sharedRecords = data as any[];
      if (sharedRecords.length === 0) return [];
      
      const fileIds = sharedRecords.filter(r => r.resource_type === 'file').map(r => r.resource_id);
      const folderIds = sharedRecords.filter(r => r.resource_type === 'folder').map(r => r.resource_id);
      
      const { data: files } = await supabase.from('files').select('id, file_name').in('id', fileIds);
      const { data: userFolders } = await supabase.from('user_folders').select('id, name').in('id', folderIds);
      const { data: teamFolders } = await supabase.from('team_folders').select('id, name').in('id', folderIds);
      
      const fileMap = Object.fromEntries((files || []).map((f: any) => [f.id, f.file_name]));
      const folderMap = Object.fromEntries([...(userFolders || []), ...(teamFolders || [])].map((f: any) => [f.id, f.name]));
      
      const shared = sharedRecords.map(item => ({
        ...item,
        resource_name: item.resource_type === "file" 
          ? fileMap[item.resource_id] 
          : folderMap[item.resource_id]
      }));
      
      return shared as ResourceShare[];
    },
  });

  const currentUserRoleQuery = useQuery({
    queryKey: ["current-user-role", resourceId],
    enabled: !!resourceId && collaboratorsQuery.isSuccess,
    queryFn: async (): Promise<ResourceRole> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "viewer";
      
      let resourceUserId: string | null = null;

      if (resourceType === "file") {
        const { data: file } = await supabase.from("files").select("user_id").eq("id", resourceId).maybeSingle();
        resourceUserId = (file as any)?.user_id;
      } else {
        // Check user_folders first
        const { data: userFolder } = await supabase.from("user_folders").select("user_id").eq("id", resourceId).maybeSingle();
        resourceUserId = (userFolder as any)?.user_id;

        // If not found, check team_folders (created_by)
        if (!resourceUserId) {
          const { data: teamFolder } = await supabase.from("team_folders").select("created_by").eq("id", resourceId).maybeSingle();
          resourceUserId = (teamFolder as any)?.created_by;
        }
      }
      
      if (resourceUserId === user.id) return "owner";
      
      const collab = collaborators.find((c: any) => c.shared_with_user_id === user.id);
      return collab?.role || "viewer";
    }
  });

  const createShare = useMutation({
    mutationFn: async ({ 
      targetUserId, 
      role 
    }: { 
      targetUserId: string; 
      role: ResourceRole 
    }) => {
      if (!resourceId) throw new Error("No resource selected");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("resource_shares" as any)
        .upsert({
          resource_id: resourceId,
          resource_type: resourceType,
          shared_with_user_id: targetUserId,
          sharer_user_id: user.id,
          role
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-shares", resourceId] });
      queryClient.invalidateQueries({ queryKey: ["current-user-role", resourceId] });
      toast.success("Permissions updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to share"),
  });

  const removeShare = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from("resource_shares" as any)
        .delete()
        .eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-shares", resourceId] });
      queryClient.invalidateQueries({ queryKey: ["current-user-role", resourceId] });
      toast.success("Collaborator removed");
    },
  });

  return {
    collaborators,
    isCollaboratorsLoading: collaboratorsQuery.isLoading,
    sharedWithMe: sharedWithMeQuery.data || [],
    currentUserRole: currentUserRoleQuery.data || (resourceId ? "viewer" : "owner"),
    createShare,
    removeShare,
  };
}
