// app/services/fetchSession.ts
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

export type SessionRow = Tables<"Session">;

/**
 * Fetch sessions for a specific child ID from Supabase.
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
  return data || [];
}

/**
 * React Query hook for real-time sessions for a child.
 */
export function useSessionsByChildId(childId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sessions-for-child", childId],
    queryFn: () => fetchSessionsByChildId(childId!),
    enabled: !!childId, // ensures it's not called until ID exists
    staleTime: 1000 * 30,
  });

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
