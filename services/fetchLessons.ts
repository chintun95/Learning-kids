// services/fetchLessons.ts
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tables } from "@/types/database.types";
import { useEffect } from "react";

// ---------------------
// TYPES
// ---------------------
export type Lesson = Tables<"lessonbank">;

// ---------------------
// FETCH FUNCTION
// ---------------------
const fetchLessons = async (): Promise<Lesson[]> => {
  console.log("🌐 Fetching lessons...");

  const { data, error } = await supabase
    .from("lessonbank")
    .select("*")
    .order("title", { ascending: true }); // Valid column

  if (error) {
    console.error("❌ Error fetching lessons:", error.message);
    throw new Error(error.message);
  }

  console.log("✅ Lessons fetched:", data?.length ?? 0);

  return data ?? [];
};

// ---------------------
// HOOK WITH REAL-TIME
// ---------------------
export const useFetchLessons = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("🔔 Subscribing to lessonbank realtime changes...");

    const channel = supabase
      .channel("lessonbank-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lessonbank",
        },
        () => {
          console.log("🔄 LessonBank changed — refreshing cache...");
          queryClient.invalidateQueries({ queryKey: ["lessons"] });
        }
      )
      .subscribe();

    return () => {
      console.log("🧹 Cleaning up lessonbank realtime subscription...");
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
    staleTime: 1000 * 30, // 30 seconds
  });
};
