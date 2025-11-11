import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

// --------------------
// Type aliases
// --------------------
type ChildRow = Tables<"Child">;
type EmergencyContactRow = Tables<"EmergencyContact">;

// --- Joined type for Supabase query results ---
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

// --- Resolve local asset safely ---
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
// Core data fetcher
// --------------------
export async function fetchChildrenByParentEmail(
  emailAddress: string
): Promise<ChildCardModel[]> {
  if (!emailAddress) return [];

  // Step 1: Lookup parent ID using email (guaranteed unique)
  const { data: parent, error: parentError } = await supabase
    .from("Parent")
    .select("id")
    .eq("emailaddress", emailAddress.trim().toLowerCase())
    .maybeSingle();

  if (parentError) {
    console.error("❌ fetchChildren: failed to find parent:", parentError);
    throw new Error(parentError.message);
  }
  if (!parent) {
    console.warn("⚠️ No parent record found for:", emailAddress);
    return [];
  }

  // Step 2: Fetch children linked to parent_id
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
    .eq("parent_id", parent.id)
    .order("firstname", { ascending: true })
    .order("lastname", { ascending: true });

  if (error) {
    console.error("❌ fetchChildren: failed to load children:", error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    console.log("ℹ️ No children linked to parent:", emailAddress);
    return [];
  }

  return data.map((c: ChildWithRelations) => {
    const ec = c.EmergencyContact ?? {};
    return {
      id: c.id,
      firstName: c.firstname,
      lastName: c.lastname,
      activityStatus:
        (c.activitystatus as "active" | "pending" | "inactive") ?? "inactive",
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
  });
}

// --------------------
// React Query hook (Parent-scoped Realtime Updates)
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

    let parentId: string | null = null;

    const setupRealtime = async () => {
      // --- Look up the parent ID for scoped subscription
      const { data: parent, error: parentError } = await supabase
        .from("Parent")
        .select("id")
        .eq("emailaddress", emailAddress.trim().toLowerCase())
        .maybeSingle();

      if (parentError || !parent) {
        console.warn(
          "⚠️ Could not set up realtime subscription: parent not found"
        );
        return;
      }

      parentId = parent.id;

      // --- Subscribe only to this parent's children
      const channel = supabase
        .channel(`children-realtime-${parentId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "Child",
            filter: `parent_id=eq.${parentId}`,
          },
          () => {
            queryClient.invalidateQueries({
              queryKey: ["children-for-parent-email", emailAddress],
            });
          }
        )
        .subscribe();

      // --- Cleanup on unmount
      return () => {
        supabase.removeChannel(channel);
      };
    };

    const unsubscribePromise = setupRealtime();
    return () => {
      // Wait for setup to finish before cleanup
      unsubscribePromise?.then((cleanup) => cleanup && cleanup());
    };
  }, [emailAddress, queryClient]);

  return query;
}

// --------------------
// Fetch a single child by ID
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
      emergencycontact_id,
      EmergencyContact:emergencycontact_id (
        name, relationship, phonenumber, streetaddress, city, state, zipcode
      )
    `
    )
    .eq("id", childId)
    .maybeSingle(); // ✅ prevents PGRST116 when no rows

  if (error) {
    console.error("❌ fetchChildById error:", error);
    throw new Error(error.message);
  }

  // ✅ If no data, just return null instead of throwing
  if (!data) {
    console.log("ℹ️ Child not found (was likely deleted):", childId);
    return null;
  }

  const ec = (data as ChildWithRelations)?.EmergencyContact ?? {};
  return {
    id: data.id,
    firstName: data.firstname,
    lastName: data.lastname,
    activityStatus: data.activitystatus as "active" | "pending" | "inactive",
    profilePin: data.profilepin,
    profilePicture: resolveProfileIcon(data.profilepicture),
    dateOfBirth: data.dateofbirth,
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
// Real-time child-by-id hook
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
