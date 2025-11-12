import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

/**
 * Deletes a child and all associated data:
 * - EmergencyContact (if linked)
 * - Answer logs or other related tables (future-proof)
 * - The child record itself
 *
 * @param childId - The unique ID of the child to delete
 * @returns true if deletion succeeds, otherwise throws an error
 */
export async function deleteChildAndAssociations(
  childId: string
): Promise<boolean> {
  try {
    // 1️⃣ Fetch the child record
    const { data: child, error: fetchError } = await supabase
      .from("Child")
      .select("id, emergencycontact_id, user_id")
      .eq("id", childId)
      .single<Tables<"Child">>();

    if (fetchError)
      throw new Error(`Unable to fetch child: ${fetchError.message}`);
    if (!child) throw new Error("Child not found.");

    // 2️⃣ Delete dependent data (if exists)
    // Example: answer logs tied to user_id
    if (child.user_id) {
      const { error: answerLogError } = await supabase
        .from("answer_log")
        .delete()
        .eq("user_id", child.user_id);

      if (answerLogError) {
        console.warn(
          "⚠️ Could not delete related answer logs:",
          answerLogError.message
        );
      }
    }

    // 3️⃣ Delete the EmergencyContact if one exists
    if (child.emergencycontact_id) {
      const { error: contactError } = await supabase
        .from("EmergencyContact")
        .delete()
        .eq("id", child.emergencycontact_id);

      if (contactError) {
        console.warn(
          "⚠️ Could not delete emergency contact:",
          contactError.message
        );
      }
    }

    // 4️⃣ Finally, delete the child record itself
    const { error: deleteError } = await supabase
      .from("Child")
      .delete()
      .eq("id", childId);

    if (deleteError)
      throw new Error(`Failed to delete child: ${deleteError.message}`);

    console.log(`🗑️ Successfully deleted child (${childId}) and related data.`);
    return true;
  } catch (error: any) {
    console.error("❌ Error deleting child:", error.message);
    throw error;
  }
}
