// utils/networkMonitor.ts
import { useNetworkStore } from "@/lib/networkStore";

export function useNetworkMonitor() {
  return useNetworkStore();
}
