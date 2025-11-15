import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tables } from "@/types/database.types";
import { useEffect } from "react";

/** -----------------------------
 * Section Row Type (updated)
 * ----------------------------- */
export type Section = Tables<"sections">;
// This now includes: id, title, user_id, lessonid (NEW)

/** -----------------------------
 * Fetch all sections
 * ----------------------------- */
const fetchSections = async (): Promise<Section[]> => {
  console.log("🌐 Fetching sections...");

  const { data, error } = await supabase
    .from("sections")
    .select("*") // includes lessonid now
    .order("title", { ascending: true });

  if (error) {
    console.error("❌ Failed to fetch sections:", error.message);
    throw new Error(error.message);
  }

  console.log("✅ Sections fetched:", data?.length ?? 0);
  return data ?? [];
};

/** -----------------------------
 * TanStack Query Hook (with realtime)
 * ----------------------------- */
export const useFetchSections = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("🔔 Subscribing to realtime section changes...");

    const subscription = supabase
      .channel("sections-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sections",
        },
        () => {
          console.log("🔄 Section change detected — refreshing...");
          queryClient.invalidateQueries({ queryKey: ["sections"] });
        }
      )
      .subscribe();

    return () => {
      console.log("🧹 Unsubscribing from section realtime updates.");
      supabase.removeChannel(subscription);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["sections"],
    queryFn: fetchSections,
    staleTime: 1000 * 30, // 30s caching (optional)
  });
};
