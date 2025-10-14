import { isSupported, getAnalytics } from "firebase/analytics";
import { Platform } from "react-native";
import { app } from "./firebase";


export async function initAnalyticsWeb() {
  if (Platform.OS !== "web") return null;
  if (await isSupported()) return getAnalytics(app);
  return null;
}
