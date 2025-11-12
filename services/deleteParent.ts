// services/deleteParent.ts
import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import type { Tables } from "@/types/database.types";

/**
 * Deletes all data associated with a parent user from Supabase.
 * This includes: Child, Achievements, Sessions, EmergencyContact,
 * Parent record, profiles, etc.
 */
export async function deleteParentFromSupabase(userId: string): Promise<void> {
  if (!userId) throw new Error("User ID is required to delete parent data.");

  // Deletion order matters because of FK constraints
  const deleteOrder = [
    "ChildAchievement",
    "Session",
    "Child",
    "EmergencyContact",
    "Achievements",
    "Parent",
    "profiles",
    "questions",
    "settings",
    "answer_log",
  ];

  for (const table of deleteOrder) {
    const { error } = await supabase
      .from(table as keyof Tables<any>)
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error(`Failed to delete from ${table}:`, error);
      throw new Error(`Failed to delete ${table} for user ${userId}`);
    }
  }

  console.log(`✅ Successfully deleted Supabase records for ${userId}`);
}

/**
 * React Query hook to delete a parent.
 * @param userId - The Clerk user ID.
 */
export const useDeleteParent = (userId: string) =>
  useMutation({
    mutationFn: async () => await deleteParentFromSupabase(userId),
  });
