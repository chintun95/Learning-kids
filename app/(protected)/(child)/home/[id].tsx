import React, { useEffect } from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ProfileIcon from "@/components/ProfileIcon";
import SwitchAccount from "@/components/SwitchAccount";
import { responsive } from "@/utils/responsive";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

export default function ChildHome() {
  const { id } = useLocalSearchParams();
  const childId = String(id);
  const { children, getCurrentChild } = useChildAuthStore();
  const queryClient = useQueryClient();
  const { startChildSession } = useSessionStore();

  const child = children.find((c) => c.id === childId) ?? getCurrentChild();

  const { mutate: setActiveStatus } = useMutation({
    mutationFn: async (childId: string) => {
      const { error } = await supabase
        .from("Child")
        .update({ activitystatus: "active" })
        .eq("id", childId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, childId) => {
      queryClient.invalidateQueries({ queryKey: ["child-by-id", childId] });
      queryClient.invalidateQueries({
        queryKey: ["children-for-parent-email"],
      });
      console.log(`✅ Child ${childId} status set to active.`);
    },
    onError: (error) => {
      console.error("❌ Failed to update child status:", error);
    },
  });

  useEffect(() => {
    if (childId) {
      //  Mark the child as active in Supabase
      setActiveStatus(childId);

      //  Start a new local session for the child with sessionType "auth"
      startChildSession(childId, "auth");
      console.log(`🟢 Started auth session for child ${childId}`);
    }
  }, [childId]);

  if (!child) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Child not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={styles.header}>
        <ProfileIcon
          source={child.profilePicture}
          size={responsive.screenWidth * 0.25}
        />
        <Text style={styles.childName}>
          {child.firstName} {child.lastName}
        </Text>
      </View>
      <SwitchAccount />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
  },
  childName: {
    marginTop: responsive.screenHeight * 0.015,
    fontSize: responsive.isNarrowScreen ? 20 : 24,
    fontFamily: "Fredoka-Bold",
    color: "#111827",
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize,
    color: "#6B7280",
  },
});
