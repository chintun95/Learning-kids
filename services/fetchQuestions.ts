import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tables } from "@/types/database.types";
import { useEffect } from "react";

export type Question = Tables<"questionbank">;

const fetchQuestions = async (): Promise<Question[]> => {
  console.log("🌐 Fetching all questions from Supabase...");
  const { data, error } = await supabase
    .from("questionbank")
    .select("*")
    .order("question", { ascending: true }); // ✅ order by valid column

  if (error) {
    console.error("❌ Supabase fetchQuestions error:", error.message);
    throw new Error(error.message);
  }

  console.log("✅ Questions fetched:", data?.length ?? 0);
  return data || [];
};

export const useFetchQuestions = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = supabase
      .channel("questionbank-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questionbank" },
        () => {
          console.log(
            "🔁 Realtime questionbank update detected — invalidating cache."
          );
          queryClient.invalidateQueries({ queryKey: ["questions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["questions"],
    queryFn: fetchQuestions,
  });
};
