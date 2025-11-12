import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tables } from "@/types/database.types";
import { useEffect } from "react";

export type Lesson = Tables<"lessonbank">;

const fetchLessons = async (): Promise<Lesson[]> => {
  console.log("🌐 Fetching lessons...");
  const { data, error } = await supabase
    .from("lessonbank")
    .select("*")
    .order("title", { ascending: true }); // ✅ valid column in LessonBank

  if (error) throw new Error(error.message);
  console.log("✅ Lessons fetched:", data?.length ?? 0);
  return data || [];
};

export const useFetchLessons = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = supabase
      .channel("lessonbank-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lessonbank" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["lessons"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
};
