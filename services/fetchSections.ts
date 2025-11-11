import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tables } from "@/types/database.types";
import { useEffect } from "react";

export type Section = Tables<"sections">;

const fetchSections = async (): Promise<Section[]> => {
  console.log("🌐 Fetching sections...");
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .order("title", { ascending: true });

  if (error) throw new Error(error.message);
  console.log("✅ Sections fetched:", data?.length ?? 0);
  return data || [];
};

export const useFetchSections = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = supabase
      .channel("sections-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sections" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sections"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["sections"],
    queryFn: fetchSections,
  });
};
