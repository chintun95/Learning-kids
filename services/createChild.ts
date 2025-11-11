import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/types/database.types";

/**
 * insertChildrenToSupabase
 * Handles inserting multiple child records into the Supabase "Child" table.
 */
async function insertChildrenToSupabase(children: TablesInsert<"Child">[]) {
  const { data, error } = await supabase
    .from("Child")
    .insert(children)
    .select("*");
  if (error) {
    console.error("❌ Supabase insert error:", error);
    throw new Error(error.message);
  }
  return data;
}

/**
 * useCreateChild
 * React Query mutation hook for adding multiple children at once.
 */
export function useCreateChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: insertChildrenToSupabase,
    onSuccess: async () => {
      // Invalidate cached queries related to children if needed
      await queryClient.invalidateQueries({ queryKey: ["children"] });
      console.log("✅ Children successfully inserted into Supabase.");
    },
    onError: (error) => {
      console.error("⚠️ Error creating children:", error);
    },
  });
}
