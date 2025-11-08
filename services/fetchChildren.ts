import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

// --------------------
// Type aliases
// --------------------
type ChildRow = Tables<"Child">;
type EmergencyContactRow = Tables<"EmergencyContact">;

// --- Custom joined type for Supabase query results ---
interface ChildWithRelations extends ChildRow {
  Parent?: { emailaddress: string } | null;
  EmergencyContact?: Partial<EmergencyContactRow> | null;
}

// --- Local profile icon map ---
const profileIconMap: Record<string, any> = {
  "avatar1.png": require("@/assets/profile-icons/avatar1.png"),
  "avatar2.png": require("@/assets/profile-icons/avatar2.png"),
  "avatar3.png": require("@/assets/profile-icons/avatar3.png"),
  "avatar4.png": require("@/assets/profile-icons/avatar4.png"),
};

// --- Resolve local asset ---
function resolveProfileIcon(path?: string | null): any {
  if (!path) return require("@/assets/profile-icons/avatar1.png");
  const filename = path.split("/").pop()?.trim();
  if (filename && profileIconMap[filename]) return profileIconMap[filename];
  if (path in profileIconMap) return profileIconMap[path];
  return require("@/assets/profile-icons/avatar1.png");
}

// --------------------
// Shared model for components
// --------------------
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
    zipcode: string;
  };
};

// --------------------
// Fetch children by parent email
// --------------------
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
      user_id,
      emergencycontact_id,
      Parent:parent_id ( emailaddress ),
      EmergencyContact:emergencycontact_id (
        name, relationship, phonenumber, streetaddress, city, state, zipcode
      )
    `
    )
    .eq("Parent.emailaddress", emailAddress)
    .order("firstname", { ascending: true })
    .order("lastname", { ascending: true });

  if (error) throw new Error(error.message);

  return (
    (data as ChildWithRelations[])?.map((c) => {
      const ec = c.EmergencyContact ?? {};

      return {
        id: c.id,
        firstName: c.firstname,
        lastName: c.lastname,
        activityStatus: c.activitystatus as "active" | "pending" | "inactive",
        profilePin: c.profilepin,
        profilePicture: resolveProfileIcon(c.profilepicture),
        dateOfBirth: c.dateofbirth,
        emergencyContact: {
          name: ec.name ?? "",
          relationship: ec.relationship ?? "",
          phoneNumber: ec.phonenumber ?? "",
          streetAddress: ec.streetaddress ?? "",
          city: ec.city ?? "",
          state: ec.state ?? "",
          zipcode: ec.zipcode ?? "",
        },
      };
    }) ?? []
  );
}

// --------------------
// React Query hook (real-time sync)
// --------------------
export function useChildrenByParentEmail(emailAddress?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["children-for-parent-email", emailAddress],
    queryFn: () => fetchChildrenByParentEmail(emailAddress as string),
    enabled: !!emailAddress,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!emailAddress) return;

    const channel = supabase
      .channel("children-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Child" },
        () => {
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

// --------------------
// Fetch a single child by ID (type-safe, real-time compatible)
// --------------------
export async function fetchChildById(
  childId: string
): Promise<ChildCardModel | null> {
  if (!childId) return null;

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
      user_id,
      emergencycontact_id,
      EmergencyContact:emergencycontact_id (
        name, relationship, phonenumber, streetaddress, city, state, zipcode
      )
    `
    )
    .eq("id", childId)
    .single();

  if (error) throw new Error(error.message);

  const c = data as ChildWithRelations;
  const ec = c.EmergencyContact ?? {};

  return {
    id: c.id,
    firstName: c.firstname,
    lastName: c.lastname,
    activityStatus: c.activitystatus as "active" | "pending" | "inactive",
    profilePin: c.profilepin,
    profilePicture: resolveProfileIcon(c.profilepicture),
    dateOfBirth: c.dateofbirth,
    emergencyContact: {
      name: ec.name ?? "",
      relationship: ec.relationship ?? "",
      phoneNumber: ec.phonenumber ?? "",
      streetAddress: ec.streetaddress ?? "",
      city: ec.city ?? "",
      state: ec.state ?? "",
      zipcode: ec.zipcode ?? "",
    },
  };
}

// --------------------
// React Query hook for one child (real-time)
// --------------------
export function useChildById(childId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["child-by-id", childId],
    queryFn: () => fetchChildById(childId as string),
    enabled: !!childId,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!childId) return;

    const channel = supabase
      .channel(`child-realtime-${childId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Child",
          filter: `id=eq.${childId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["child-by-id", childId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId, queryClient]);

  return query;
}
