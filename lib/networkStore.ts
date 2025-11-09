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

// Subscribe globally once when app mounts
NetInfo.addEventListener((state) => {
  useNetworkStore.setState({
    isConnected: !!state.isConnected,
    isInternetReachable: !!state.isInternetReachable,
    initialized: true,
  });
});
