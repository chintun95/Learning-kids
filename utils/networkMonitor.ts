import NetInfo from "@react-native-community/netinfo";
import { useNetworkStore } from "@/lib/networkStore";

/** Hook-style wrapper so you can do: const net = useNetworkMonitor() in components */
export function useNetworkMonitor() {
  // This is a Zustand hook; safe to call inside components
  return useNetworkStore();
}

/** One-shot connectivity check for Retry buttons, etc. */
export async function checkNetworkOnce(): Promise<boolean> {
  const state = await NetInfo.fetch();
  const connected = !!state.isConnected;
  // isInternetReachable can be null on some platforms, treat null as "unknown" not false
  const reachable =
    state.isInternetReachable === null ||
    state.isInternetReachable === undefined
      ? true
      : !!state.isInternetReachable;

  return connected && reachable;
}

/** Optional: await reconnection with a timeout (handy for flows that can wait) */
export async function waitForReconnect(
  timeoutMs = 10000,
  pollMs = 1000
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkNetworkOnce()) return true;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return false;
}
