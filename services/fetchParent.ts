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
    .single();
  if (error) throw new Error(error.message);
  return data;
}
