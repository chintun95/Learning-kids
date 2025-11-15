import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

/** ---------- Types ---------- **/
export type QuestionLogRow = Tables<"questionlog">;

/** ---------- Fetch Function ---------- **/
const fetchQuestionLogs = async (): Promise<QuestionLogRow[]> => {
  const { data, error } = await supabase
    .from("questionlog")
    .select("*")
    .order("completedat", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
};

/** ---------- Hook with Realtime ---------- **/
export const useFetchQuestionLogs = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["questionlog"],
    queryFn: fetchQuestionLogs,
  });

  useEffect(() => {
    const channel = supabase
      .channel("questionlog-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questionlog" },
        (payload) => {
          console.log("📡 QuestionLog change detected:", payload);
          queryClient.invalidateQueries({ queryKey: ["questionlog"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
