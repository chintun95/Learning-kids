import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

export type AchievementRow = Tables<"Achievements">;

export async function fetchAllAchievements(): Promise<AchievementRow[]> {
  const { data, error } = await supabase
    .from("Achievements")
    .select("*")
    .order("title", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
