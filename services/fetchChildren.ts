import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

type ChildRow = Tables<"Child">;
type EmergencyContactRow = Tables<"EmergencyContact">;

// --- Local profile icon mapping ---
const profileIconMap: Record<string, any> = {
  "avatar1.png": require("@/assets/profile-icons/avatar1.png"),
  "avatar2.png": require("@/assets/profile-icons/avatar2.png"),
  "avatar3.png": require("@/assets/profile-icons/avatar3.png"),
  "avatar4.png": require("@/assets/profile-icons/avatar4.png"),
};

function resolveProfileIcon(path?: string | null): any {
  if (!path) return require("@/assets/profile-icons/avatar1.png");
  const filename = path.split("/").pop()?.trim();
  if (filename && profileIconMap[filename]) return profileIconMap[filename];
  if (path in profileIconMap) return profileIconMap[path];
  return require("@/assets/profile-icons/avatar1.png");
}

export type ChildCardModel = {
  id: string;
  firstName: string;
  lastName: string;
  activityStatus: "active" | "pending" | "inactive";
  profilePin: string | null;
  profilePicture: any;
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
      Parent:parent_id ( emailaddress ),
      EmergencyContact:emergencycontact_id ( name, relationship, phonenumber, streetaddress, city, state )
    `
    )
    .eq("Parent.emailaddress", emailAddress)
    .order("firstname", { ascending: true })
    .order("lastname", { ascending: true });

  if (error) throw new Error(error.message);

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
 * Real-time React Query hook
 */
export function useChildrenByParentEmail(emailAddress?: string) {
  const queryClient = useQueryClient();

  // Primary query
  const query = useQuery({
    queryKey: ["children-for-parent-email", emailAddress],
    queryFn: () => fetchChildrenByParentEmail(emailAddress as string),
    enabled: !!emailAddress,
    staleTime: 1000 * 30,
  });

  // Real-time listener setup
  useEffect(() => {
    if (!emailAddress) return;

    const channel = supabase
      .channel("children-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*", // listen for INSERT, UPDATE, DELETE
          schema: "public",
          table: "Child",
        },
        (payload) => {
          console.log("🔁 Child table changed:", payload.eventType);
          // Invalidate and refetch the children list
          queryClient.invalidateQueries({
            queryKey: ["children-for-parent-email", emailAddress],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [emailAddress, queryClient]);

  return query;
}
