// app/(protected)/(child)/_layout.tsx
import React, { useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useNetworkMonitor } from "@/utils/networkMonitor";

export default function ProtectedChildLayout() {
  const { isConnected, isInternetReachable, initialized } = useNetworkMonitor();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!initialized) return;

    const testDatabaseConnection = async () => {
      try {
        console.log("🌐 Connection restored. Testing Supabase connectivity...");
        const { data, error } = await supabase
          .from("Child")
          .select("id")
          .limit(1);
        if (error)
          console.error("❌ Supabase test query failed:", error.message);
        else
          console.log(
            "✅ Supabase connection successful.",
            data?.length ? data : "No records found (but connected)"
          );
      } catch (err) {
        console.error("⚠️ Database test error:", err);
      } finally {
        hasCheckedRef.current = false;
      }
    };

    if (isConnected && isInternetReachable && !hasCheckedRef.current) {
      hasCheckedRef.current = true;
      testDatabaseConnection();
    }
  }, [isConnected, isInternetReachable, initialized]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
