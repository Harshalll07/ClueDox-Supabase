import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// CREATE HELPER (Per Requirements)
export const createNotification = async ({
  user_id,
  type,
  title,
  description,
  link,
}: {
  user_id: string;
  type: "community_invite" | "community_join" | "community_file" | "file_shared" | "subscription_warning" | "subscription_expired" | "reminder_alert" | "file_uploaded";
  title: string;
  description: string;
  link?: string;
}) => {
  const { error } = await (supabase as any).from("app_notifications").insert({
    user_id,
    type,
    title,
    description,
    link,
  });
  if (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

export function useNotifications() {
  const queryClient = useQueryClient();

  // 1. Fetch data
  const query = useQuery({
    queryKey: ["app-notifications"],
    queryFn: async (): Promise<AppNotification[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("app_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as AppNotification[];
    },
  });

  // 2. Realtime subscription (PER REQUIREMENTS: app_notifications ONLY)
  useEffect(() => {
    const channel = supabase
      .channel("app_notifications_channel")
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "app_notifications",
        },
        (payload: any) => {
          // 🔥 REALTIME TOAST (Per Requirements)
          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as AppNotification;
            toast(newNotif.title, {
              description: newNotif.description,
              action: newNotif.link ? {
                label: "View",
                onClick: () => window.location.href = newNotif.link!
              } : undefined
            });
          }

          // Update data on change
          queryClient.invalidateQueries({ queryKey: ["app-notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return data?.filter((n) => !n.is_read).length || 0;
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("app_notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from("app_notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-notifications"] });
    },
  });
}
