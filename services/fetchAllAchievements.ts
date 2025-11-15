// app/services/fetchAllAchievements.ts
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

// Type for Achievements table
export type AchievementRow = Tables<"Achievements">;

/**
 * Fetch every defined achievement in the system.
 */
export async function fetchAllAchievements(): Promise<AchievementRow[]> {
  const { data, error } = await supabase
    .from("Achievements")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    console.error("❌ fetchAllAchievements error:", error.message);
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * React Query hook for global achievements list.
 * Live-synced with Supabase.
 */
export function useAllAchievements() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["all-achievements"],
    queryFn: fetchAllAchievements,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  /** -------------------------
   * Real-Time Supabase Updates
   * ------------------------- */
  useEffect(() => {
    const channel = supabase
      .channel("all-achievements-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Achievements",
        },
        () => {
          console.log("🔄 Achievement definitions changed → refreshing...");
          queryClient.invalidateQueries({ queryKey: ["all-achievements"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
