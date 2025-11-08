import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { responsive } from "@/utils/responsive";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function SwitchAccount() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { getCurrentChild, clearSelection } = useChildAuthStore();
  const { endSession } = useSessionStore();

  /**
   * Mutation to set a child's activity status to "inactive".
   * Uses Supabase and TanStack Query for proper state invalidation.
   */
  const { mutate: setInactiveStatus, isPending } = useMutation({
    mutationFn: async (childId: string) => {
      const { error } = await supabase
        .from("Child")
        .update({ activitystatus: "inactive" })
        .eq("id", childId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, childId) => {
      // Invalidate related queries so parent/child lists refetch
      queryClient.invalidateQueries({ queryKey: ["child-by-id", childId] });
      queryClient.invalidateQueries({
        queryKey: ["children-for-parent-email"],
      });
      console.log(`✅ Child ${childId} status set to inactive.`);
    },
    onError: (error) => {
      console.error("❌ Failed to update child status:", error);
    },
  });

  const handlePress = () => {
    const lastChild = getCurrentChild();

    if (lastChild) {
      console.log(
        `👤 Last logged-in child before switch: ${lastChild.firstName} ${lastChild.lastName}`
      );

      // 1️⃣ End the current local session for the child
      endSession();
      console.log(`🕒 Ended local session for child ${lastChild.id}`);

      // 2️⃣ Mark as inactive in Supabase
      setInactiveStatus(lastChild.id);
    } else {
      console.log("⚠️ No currently active child to log before switching.");
    }

    // 3️⃣ Clear current child and record as previous
    clearSelection();

    // 4️⃣ Navigate back to the child profile selection screen
    router.push("/(protected)/(child)");
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      disabled={isPending}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, isPending && { opacity: 0.6 }]}>
        {isPending ? "Switching..." : "Switch Account"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: responsive.screenHeight * 0.02,
  },
  text: {
    fontSize: responsive.buttonFontSize,
    fontFamily: "Fredoka-Medium",
    color: "#4F46E5",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
