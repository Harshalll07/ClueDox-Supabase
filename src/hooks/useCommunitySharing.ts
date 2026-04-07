import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SharedResource {
    id: string;
    file_id?: string;
    folder_id?: string;
    team_id: string;
    shared_with_user_id: string | null;
    permission: "view" | "edit";
    created_by: string;
    created_at: string;
    teams?: { name: string };
    profiles?: { full_name: string };
    files?: { file_name: string };
}

export function useCommunitySharing(resourceId?: string, resourceType: "file" | "folder" = "file") {
    const queryClient = useQueryClient();

    const sharedResourcesQuery = useQuery({
        queryKey: ["community-shared-resources", resourceId],
        enabled: !!resourceId,
        queryFn: async (): Promise<SharedResource[]> => {
            const table = resourceType === "file" ? "shared_files" : "shared_folders";
            const idColumn = resourceType === "file" ? "file_id" : "folder_id";

            const { data, error } = await supabase
                .from(table)
                .select(`
                  *,
                  teams ( name ),
                  profiles:shared_with_user_id ( full_name )
                `)
                .eq(idColumn, resourceId!);

            if (error) throw error;
            return (data || []) as SharedResource[];
        },
    });

    const createCommunityShare = useMutation({
        mutationFn: async ({
            teamId,
            sharedWithUserId,
            permission
        }: {
            teamId: string;
            sharedWithUserId: string | null;
            permission: "view" | "edit";
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const table = resourceType === "file" ? "shared_files" : "shared_folders";
            const idColumn = resourceType === "file" ? "file_id" : "folder_id";

            const { error } = await supabase
                .from(table)
                .upsert({
                    [idColumn]: resourceId!,
                    team_id: teamId,
                    shared_with_user_id: sharedWithUserId,
                    permission,
                    created_by: user.id
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["community-shared-resources", resourceId] });
            toast.success("Resource shared successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to share resource");
        }
    });

    const removeCommunityShare = useMutation({
        mutationFn: async (id: string) => {
            const table = resourceType === "file" ? "shared_files" : "shared_folders";
            const { error } = await supabase
                .from(table)
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["community-shared-resources", resourceId] });
            toast.success("Sharing revoked");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to revoke sharing");
        }
    });

    return {
        shares: sharedResourcesQuery.data || [],
        isLoading: sharedResourcesQuery.isLoading,
        createCommunityShare,
        removeCommunityShare
    };
}
