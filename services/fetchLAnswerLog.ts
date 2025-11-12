import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

/** ---------- Types ---------- **/
export type AnswerLogRow = Tables<"answer_log">;

/** ---------- Fetch Function ---------- **/
const fetchAnswerLogs = async (): Promise<AnswerLogRow[]> => {
  const { data, error } = await supabase
    .from("answer_log")
    .select("*")
    .order("answered_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
};

/** ---------- Hook with Realtime ---------- **/
export const useFetchAnswerLogs = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["answer_log"],
    queryFn: fetchAnswerLogs,
  });

  useEffect(() => {
    const channel = supabase
      .channel("answer_log-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answer_log" },
        (payload) => {
          console.log("📡 AnswerLog change detected:", payload);
          queryClient.invalidateQueries({ queryKey: ["answer_log"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
