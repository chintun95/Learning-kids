import React, { useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useNetworkMonitor } from "@/utils/networkMonitor";

/**
 * ProtectedChildLayout — wraps all child-side routes.
 * Monitors network and silently checks database connectivity when back online.
 */
export default function ProtectedChildLayout() {
  const { isConnected, isInternetReachable } = useNetworkMonitor(false);
  const hasCheckedRef = useRef(false);

  // 🔄 Silent background network check when connection returns
  useEffect(() => {
    const testDatabaseConnection = async () => {
      try {
        console.log("🌐 Connection restored. Testing Supabase connectivity...");
        const { data, error } = await supabase
          .from("Child")
          .select("id")
          .limit(1);

        if (error) {
          console.error("❌ Supabase test query failed:", error.message);
        } else {
          console.log(
            "✅ Supabase connection successful. Response:",
            data?.length ? data : "No records found (but connected)"
          );
        }
      } catch (err) {
        console.error("⚠️ Database test error:", err);
      } finally {
        hasCheckedRef.current = false;
      }
    };

    // Run check only when coming back online
    if (isConnected && isInternetReachable && !hasCheckedRef.current) {
      hasCheckedRef.current = true;
      testDatabaseConnection();
    }
  }, [isConnected, isInternetReachable]);

  // 🧱 Normal child routes — unchanged
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="home/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="game-select" options={{ headerShown: false }} />
    </Stack>
  );
}
