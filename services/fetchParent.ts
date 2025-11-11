import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

/**
 * Fetches parent info via email
 */
export async function fetchParentByEmail(
  emailAddress: string
): Promise<Tables<"Parent"> | null> {
  const { data, error } = await supabase
    .from("Parent")
    .select("*")
    .eq("emailaddress", emailAddress)
    .maybeSingle(); // ✅ safer alternative to .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 = "Results contain 0 rows" — ignore this harmless case
    throw new Error(error.message);
  }

  return data ?? null;
}
