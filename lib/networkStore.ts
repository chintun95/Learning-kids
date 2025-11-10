// lib/networkStore.ts
import NetInfo from "@react-native-community/netinfo";
import { create } from "zustand";

type NetworkState = {
  isConnected: boolean;
  isInternetReachable: boolean;
  initialized: boolean;
};

export const useNetworkStore = create<NetworkState>(() => ({
  isConnected: true,
  isInternetReachable: true,
  initialized: false,
}));

// Subscribe globally once when this module is evaluated
// It’s safe in Expo/React Native (runs on app start)
NetInfo.addEventListener((state) => {
  useNetworkStore.setState({
    isConnected: !!state.isConnected,
    isInternetReachable:
      state.isInternetReachable === null ||
      state.isInternetReachable === undefined
        ? true
        : !!state.isInternetReachable,
    initialized: true,
  });
});
