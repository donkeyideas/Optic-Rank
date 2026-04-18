import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

/**
 * Fetch the current user's notifications, ordered by created_at descending.
 */
export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, user_id, title, body, type, is_read, action_url, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !data) return [];

      return data as Notification[];
    },
  });
}

/**
 * Mutation to mark a notification as read.
 * Updates is_read = true on the given notification ID.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
