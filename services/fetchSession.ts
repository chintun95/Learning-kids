// app/services/fetchSession.ts
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

// Type alias for Session table
export type SessionRow = Tables<"Session">;

/**
 * Fetch all sessions for a given child ID
 */
export async function fetchSessionsByChildId(
  childId: string
): Promise<SessionRow[]> {
  if (!childId) return [];

  const { data, error } = await supabase
    .from("Session")
    .select("*")
    .eq("childid", childId)
    .order("date", { ascending: false })
    .order("starttime", { ascending: false });

  if (error) throw new Error(error.message);
  return data as SessionRow[];
}

/**
 * React Query hook to subscribe to session updates for a child in real-time
 */
export function useSessionsByChildId(childId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sessions-for-child", childId],
    queryFn: () => fetchSessionsByChildId(childId as string),
    enabled: !!childId,
    staleTime: 1000 * 30, // 30s
  });

  // Real-time subscription to Supabase changes
  useEffect(() => {
    if (!childId) return;

    const channel = supabase
      .channel(`sessions-realtime-${childId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Session",
          filter: `childid=eq.${childId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["sessions-for-child", childId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId, queryClient]);

  return query;
}
