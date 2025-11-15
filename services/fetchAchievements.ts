// app/services/fetchAchievements.ts
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

// Define DB table types
type ChildAchievementRow = Tables<"ChildAchievement">;
type AchievementRow = Tables<"Achievements">;

// Combined result with achievement info from Achievements table
export interface ChildAchievementWithInfo extends ChildAchievementRow {
  achievement?: Pick<AchievementRow, "id" | "title" | "description"> | null;
}

/**
 * Fetch all achievements earned for a given child ID.
 * Includes achievement details (title, description) from Achievements table.
 */
export async function fetchAchievementsByChildId(
  childId: string
): Promise<ChildAchievementWithInfo[]> {
  if (!childId) return [];

  const { data, error } = await supabase
    .from("ChildAchievement")
    .select(
      `
      id,
      dateearned,
      achievementearned,
      childid,
      user_id,
      achievement:Achievements!childachievement_achievementearned_fkey (
        id,
        title,
        description
      )
    `
    )
    .eq("childid", childId)
    .order("dateearned", { ascending: false });

  if (error) {
    console.error("❌ fetchAchievementsByChildId error:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as ChildAchievementWithInfo[];
}

/**
 * React Query hook: Fetch achievements for a specific child.
 * Automatically updates when Supabase data changes in real time.
 */
export function useAchievementsByChildId(childId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["achievements-for-child", childId],
    queryFn: () => fetchAchievementsByChildId(childId as string),
    enabled: !!childId,
    staleTime: 1000 * 30, // 30s cache
  });

  // Real-time subscription for live updates
  useEffect(() => {
    if (!childId) return;

    const channel = supabase
      .channel(`child-achievements-realtime-${childId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ChildAchievement",
          filter: `childid=eq.${childId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["achievements-for-child", childId],
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
