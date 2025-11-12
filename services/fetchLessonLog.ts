import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

/** ---------- Types ---------- **/
export type LessonLogRow = Tables<"lessonlog">;

/** ---------- Fetch Function ---------- **/
const fetchLessonLogs = async (): Promise<LessonLogRow[]> => {
  const { data, error } = await supabase
    .from("lessonlog")
    .select("*")
    .order("completedat", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
};

/** ---------- Hook with Realtime ---------- **/
export const useFetchLessonLogs = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lessonlog"],
    queryFn: fetchLessonLogs,
  });

  useEffect(() => {
    const channel = supabase
      .channel("lessonlog-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lessonlog" },
        (payload) => {
          console.log("📡 LessonLog change detected:", payload);
          queryClient.invalidateQueries({ queryKey: ["lessonlog"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
