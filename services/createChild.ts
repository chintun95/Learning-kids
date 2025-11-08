import { supabase } from "@/lib/supabase";
import { TablesInsert } from "@/types/database.types";

/**
 * Inserts a new child record into Supabase
 */
export async function createChild(child: TablesInsert<"Child">) {
  const { data, error } = await supabase
    .from("Child")
    .insert(child)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
