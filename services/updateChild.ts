import { supabase } from "@/lib/supabase";
import { TablesUpdate } from "@/types/database.types";
import { ChildCardModel } from "@/services/fetchChildren";

// -------------------------
// Type Aliases
// -------------------------
type ChildUpdate = TablesUpdate<"Child">;

/**
 * Update a child's record in Supabase.
 * This function can handle both parent and child updates depending on which fields are passed.
 *
 * @param childId - UUID of the child to update
 * @param updates - Partial update fields
 * @returns Updated child data or throws error
 */
export async function updateChild(
  childId: string,
  updates: Partial<ChildUpdate>
): Promise<void> {
  if (!childId) throw new Error("Child ID is required for update.");

  const { error } = await supabase
    .from("Child")
    .update(updates)
    .eq("id", childId);

  if (error) {
    console.error("❌ Failed to update child:", error.message);
    throw new Error(error.message);
  }

  console.log("✅ Child updated successfully:", updates);
}

// ----------------------------------------------------------
// React Query mutation hook (for UI integration)
// ----------------------------------------------------------
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Parent Update Hook
 * Used in manage-child/[id] for updating all fields EXCEPT profile picture.
 */
export function useUpdateChildByParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      childId,
      updates,
    }: {
      childId: string;
      updates: Partial<ChildUpdate>;
    }) => {
      // Disallow updating the profile icon in parent context
      const { profilepicture, ...allowedUpdates } = updates;
      return updateChild(childId, allowedUpdates);
    },
    onSuccess: (_, { childId }) => {
      // Refresh child data after successful update
      queryClient.invalidateQueries({ queryKey: ["child-by-id", childId] });
      queryClient.invalidateQueries({
        queryKey: ["children-for-parent-email"],
      });
    },
  });
}

/**
 * Child Update Hook
 * Used when the child updates their own profile picture (and nothing else).
 */
export function useUpdateChildProfileIcon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      childId,
      newProfileIcon,
    }: {
      childId: string;
      newProfileIcon: string;
    }) => {
      // Only allow updating the profile picture
      return updateChild(childId, { profilepicture: newProfileIcon });
    },
    onSuccess: (_, { childId }) => {
      // Invalidate both caches
      queryClient.invalidateQueries({ queryKey: ["child-by-id", childId] });
      queryClient.invalidateQueries({
        queryKey: ["children-for-parent-email"],
      });
    },
  });
}

/**
 *  Helper utility for merging UI form data into DB format
 * Maps a ChildCardModel (UI model) into the DB update payload
 */
export function mapChildFormToUpdate(
  formData: ChildCardModel
): Partial<ChildUpdate> {
  return {
    firstname: formData.firstName,
    lastname: formData.lastName,
    activitystatus: formData.activityStatus,
    profilepin: formData.profilePin,
    dateofbirth: formData.dateOfBirth,
    emergencycontact_id: null, // You’ll later connect this to your emergency contact updates
  };
}
