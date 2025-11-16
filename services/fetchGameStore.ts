// services/fetchGameStore.ts
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

/** Row type for the gamestore table */
export type GameStoreRow = Tables<"gamestore">;

/** Fetch all gamestore rows for a given child (ordered by completedat) */
const fetchGameStoreByChild = async (
  childId: string
): Promise<GameStoreRow[]> => {
  const { data, error } = await supabase
    .from("gamestore")
    .select("*")
    .eq("childid", childId)
    .order("completedat", { ascending: true });

  if (error) {
    console.error("[gamestore] fetch error:", error);
    throw error;
  }

  return data ?? [];
};

/**
 * TanStack Query hook:
 * - Loads all gamestore rows for a child
 * - Subscribes to realtime changes and invalidates query on change
 */
export const useFetchGameStoreByChild = (childId?: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery<GameStoreRow[]>({
    queryKey: ["gamestore-by-child", childId],
    queryFn: () => {
      if (!childId) return Promise.resolve([] as GameStoreRow[]);
      return fetchGameStoreByChild(childId);
    },
    enabled: !!childId,
  });

  useEffect(() => {
    if (!childId) return;

    const channel = supabase
      .channel(`gamestore-child-${childId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gamestore",
          filter: `childid=eq.${childId}`,
        },
        () => {
          // Re-fetch data whenever any row for this child changes
          queryClient.invalidateQueries({
            queryKey: ["gamestore-by-child", childId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId, queryClient]);

  return query;
};
