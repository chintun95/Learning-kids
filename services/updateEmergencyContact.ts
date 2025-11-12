import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { emergencyContactSchema } from "@/utils/formatter";
import { useUpdateChildByParent } from "./updateChild";

export type EmergencyContact = z.infer<typeof emergencyContactSchema>;

interface UpdateEmergencyContactParams {
  childId: string;
  contact: EmergencyContact;
}

/**
 * Updates or creates a child's emergency contact.
 * If a contact exists, updates it. Otherwise, creates one and links it to the child.
 */
export const updateEmergencyContact = async ({
  childId,
  contact,
}: UpdateEmergencyContactParams): Promise<void> => {
  // Validate input
  const result = emergencyContactSchema.safeParse(contact);
  if (!result.success) throw new Error("Invalid emergency contact data");

  // Check if child already has an emergency contact
  const { data: childData, error: childError } = await supabase
    .from("Child")
    .select("emergencycontact_id")
    .eq("id", childId)
    .single();

  if (childError) throw childError;

  const contactId = childData?.emergencycontact_id;

  if (contactId) {
    // Update existing contact
    const { error: ecError } = await supabase
      .from("EmergencyContact")
      .update({
        name: contact.name,
        relationship: contact.relationship,
        phonenumber: contact.phoneNumber,
        streetaddress: contact.streetAddress,
        city: contact.city,
        state: contact.state,
        zipcode: contact.zipcode,
      })
      .eq("id", contactId);

    if (ecError) throw ecError;
  } else {
    // Create new contact
    const { data: newContact, error: insertError } = await supabase
      .from("EmergencyContact")
      .insert([
        {
          name: contact.name,
          relationship: contact.relationship,
          phonenumber: contact.phoneNumber,
          streetaddress: contact.streetAddress,
          city: contact.city,
          state: contact.state,
          zipcode: contact.zipcode,
        },
      ])
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Link to child
    const { error: linkError } = await supabase
      .from("Child")
      .update({ emergencycontact_id: newContact.id })
      .eq("id", childId);

    if (linkError) throw linkError;
  }
};

/**
 * React Query mutation hook for updating or creating an emergency contact
 */
export const useUpdateEmergencyContact = () => {
  const queryClient = useQueryClient();
  const { mutate: updateChildByParent } = useUpdateChildByParent();

  return useMutation({
    mutationFn: async (params: UpdateEmergencyContactParams) => {
      await updateEmergencyContact(params);
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["children", variables.childId],
      });
    },
    onError: (error) => {
      console.error("❌ Failed to update emergency contact:", error);
    },
  });
};
