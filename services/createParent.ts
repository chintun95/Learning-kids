// services/createParent.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Represents the parent record to insert into the database.
 * Excludes the `user_id` column as per requirements.
 */
export interface ParentInput {
  firstname: string;
  lastname: string;
  emailaddress: string;
  childrenunderaccount?: number;
}

/**
 * Inserts (or updates) a parent record into the Parent table using Clerk data.
 * Supabase automatically assigns a UUID id.
 */
export async function createParent(data: ParentInput) {
  if (!data.firstname || !data.lastname || !data.emailaddress) {
    throw new Error("Missing required parent fields.");
  }

  const { data: inserted, error } = await supabase
    .from("Parent")
    .upsert(
      {
        firstname: data.firstname.trim(),
        lastname: data.lastname.trim(),
        emailaddress: data.emailaddress.trim().toLowerCase(),
        childrenunderaccount: data.childrenunderaccount ?? 0,
      },
      { onConflict: "emailaddress" } // ensures one record per email
    )
    .select()
    .single();

  if (error) {
    console.error("❌ Supabase insert error:", error);
    throw new Error(error.message);
  }

  console.log("✅ Parent created/upserted:", inserted);
  return inserted;
}

/**
 * React Query mutation for creating a parent.
 */
export function useCreateParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createParent,
    onSuccess: (data) => {
      console.log("✅ Parent created successfully:", data);
      // Invalidate any parent- or email-based child queries
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "children-for-parent-email" ||
          query.queryKey[0] === "children",
      });
    },
    onError: (error: any) => {
      console.error("❌ Error creating parent:", error.message || error);
    },
  });
}
