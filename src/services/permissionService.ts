import { supabase } from "@/integrations/supabase/client";

export type ResourceRole = 'viewer' | 'editor' | 'admin' | 'owner';

export interface ResourceAccess {
    role: ResourceRole | null;
    canView: boolean;
    canEdit: boolean;
    canAdmin: boolean;
}

export const permissionService = {
    /**
     * Checks a user's access level for a specific folder (recursive)
     */
    async getFolderAccess(folderId: string, userId: string): Promise<ResourceAccess> {
        if (!folderId || !userId) return this.noAccess();

        try {
            const { data, error } = await supabase.rpc('check_folder_access', {
                target_folder_id: folderId,
                target_user_id: userId
            });

            if (error) {
                console.error("Permission check failed:", error);
                return this.noAccess();
            }

            const role = data as ResourceRole | null;
            return {
                role,
                canView: !!role,
                canEdit: role === 'editor' || role === 'admin' || role === 'owner',
                canAdmin: role === 'admin' || role === 'owner',
            };
        } catch (e) {
            console.error("Permission service error:", e);
            return this.noAccess();
        }
    },

    /**
     * Checks if the resource is public
     */
    async isFolderPublic(folderId: string): Promise<boolean> {
        const { data } = await supabase
            .from('team_folders')
            .select('is_public')
            .eq('id', folderId)
            .single();
        
        return !!data?.is_public;
    },

    noAccess(): ResourceAccess {
        return { role: null, canView: false, canEdit: false, canAdmin: false };
    }
};
