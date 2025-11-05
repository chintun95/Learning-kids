import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

// --- Type Aliases ---
type ChildRow = Tables<"Child">;
type EmergencyContactRow = Tables<"EmergencyContact">;

// --- Local Profile Icon Mapping ---
const profileIconMap: Record<string, any> = {
  "avatar1.png": require("@/assets/profile-icons/avatar1.png"),
  "avatar2.png": require("@/assets/profile-icons/avatar2.png"),
  "avatar3.png": require("@/assets/profile-icons/avatar3.png"),
  "avatar4.png": require("@/assets/profile-icons/avatar4.png"),
  // add any additional icons you have under assets/profile-icons/
};

export type ChildCardModel = {
  id: string;
  firstName: string;
  lastName: string;
  activityStatus: "active" | "pending" | "inactive";
  profilePin: string | null;
  profilePicture: any; // actual require()d image object
  dateOfBirth: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
    streetAddress: string;
    city: string;
    state: string;
  };
};

/**
 * Helper to resolve a Supabase-stored string path into a local image require()
 */
function resolveProfileIcon(path?: string | null): any {
  if (!path) return require("@/assets/profile-icons/avatar1.png"); // fallback

  // Extract filename if the path includes /assets/profile-icons/
  const filename = path.split("/").pop()?.trim();

  if (filename && profileIconMap[filename]) {
    return profileIconMap[filename];
  }

  // If Supabase accidentally stores the filename directly (e.g., "avatar3.png")
  if (path in profileIconMap) {
    return profileIconMap[path];
  }

  // Fallback default icon
  return require("@/assets/profile-icons/avatar1.png");
}

/**
 * Fetches all children for the parent (joined via email)
 */
export async function fetchChildrenByParentEmail(
  emailAddress: string
): Promise<ChildCardModel[]> {
  if (!emailAddress) return [];

  const { data, error } = await supabase
    .from("Child")
    .select(
      `
      id,
      firstname,
      lastname,
      activitystatus,
      profilepin,
      profilepicture,
      dateofbirth,
      parent_id,
      emergencycontact_id,

      Parent:parent_id (
        id,
        emailaddress
      ),

      EmergencyContact:emergencycontact_id (
        id,
        name,
        relationship,
        phonenumber,
        streetaddress,
        city,
        state,
        zipcode
      )
    `
    )
    .eq("Parent.emailaddress", emailAddress)
    .order("firstname", { ascending: true });

  if (error) {
    console.error("Error fetching children:", error.message);
    throw new Error(error.message);
  }

  return (
    data?.map((row: any) => {
      const c: ChildRow = row;
      const ec: EmergencyContactRow | null = row?.EmergencyContact ?? null;

      return {
        id: c.id,
        firstName: c.firstname,
        lastName: c.lastname,
        activityStatus: c.activitystatus as "active" | "pending" | "inactive",
        profilePin: c.profilepin,
        profilePicture: resolveProfileIcon(c.profilepicture),
        dateOfBirth: c.dateofbirth,
        emergencyContact: {
          name: ec?.name ?? "",
          relationship: ec?.relationship ?? "",
          phoneNumber: ec?.phonenumber ?? "",
          streetAddress: ec?.streetaddress ?? "",
          city: ec?.city ?? "",
          state: ec?.state ?? "",
        },
      };
    }) ?? []
  );
}

/**
 * React Query hook
 */
export function useChildrenByParentEmail(emailAddress?: string) {
  return useQuery({
    queryKey: ["children-for-parent-email", emailAddress],
    queryFn: () => fetchChildrenByParentEmail(emailAddress as string),
    enabled: !!emailAddress,
    staleTime: 1000 * 30,
  });
}
