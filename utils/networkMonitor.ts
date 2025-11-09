import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

/**
 * Hook to monitor network connectivity across the app.
 * @param showAlerts Whether to show system alerts when connection status changes.
 */
export function useNetworkMonitor(showAlerts = false) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = !!state.isConnected;
      const reachable = state.isInternetReachable ?? false;

      setIsConnected(connected);
      setIsInternetReachable(reachable);

      if (showAlerts) {
        if (!connected || !reachable) {
          Alert.alert(
            "Network Connection Lost",
            "Please check your internet connection."
          );
        } else {
          Alert.alert("Connected", "Internet connection restored.");
        }
      }

      console.log(
        `🌐 Network status updated → connected=${connected}, reachable=${reachable}`
      );
    });

    return () => unsubscribe();
  }, [showAlerts]);

  return { isConnected, isInternetReachable };
}

/**
 * One-time async check for connectivity.
 * Used in NetworkLost Retry button or manual re-syncs.
 * @returns Promise<boolean> → true if internet is reachable.
 */
export async function checkNetworkOnce(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    const connected = !!state.isConnected;
    const reachable = state.isInternetReachable ?? false;
    console.log(
      `🔎 One-time check → connected=${connected}, reachable=${reachable}`
    );
    return connected && reachable;
  } catch (err) {
    console.error("❌ Failed to check network status:", err);
    return false;
  }
}
