import { supabase } from "@/integrations/supabase/client";

export const userService = {
    /**
     * Looks up a user's UUID by their email using a secure RPC function.
     * This is required because auth.users is not directly accessible.
     */
    async getUserIdByEmail(email: string): Promise<string | null> {
        if (!email) return null;

        try {
            const { data, error } = await (supabase.rpc as any)('get_user_id_by_email', {
                email_text: email.trim().toLowerCase()
            });

            if (error) {
                console.error("User lookup failed:", error);
                return null;
            }

            return data as string | null;
        } catch (e) {
            console.error("User service error:", e);
            return null;
        }
    },

    /**
     * Fetches basic profile info for a user
     */
    async getUserProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
        
        if (error) console.error("Profile fetch failed:", error);
        return data;
    }
};
