// file: utils/notifications.ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Updates from "expo-updates";

// --- Configure global notification handler ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// --- Internal cache for token ---
let cachedPushToken: string | null = null;

// 🟢 Register for push notifications
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (!Device.isDevice) {
    console.warn("Must use a physical device for push notifications");
    return null;
  }

  try {
    // Android: ensure a default notification channel exists
    if (Device.osName?.toLowerCase?.().includes("android")) {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }
  } catch (e) {
    console.warn("Could not create Android notification channel:", e);
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.warn("Push notification permission not granted");
    return null;
  }

  try {
    // ✅ Get Expo projectId from config or Updates manifest (no deprecated manifest usage)
    const expoProjectId =
      (Constants?.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants?.expoConfig as any)?.projectId ||
      (Updates?.manifest as any)?.extra?.expoClient?.projectId ||
      (Updates?.manifest as any)?.projectId;

    if (!expoProjectId) {
      console.warn(
        "Expo projectId not found in app config. Add 'extra.eas.projectId' or 'expo.projectId' in app.json/app.config.js."
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: expoProjectId,
    });
    cachedPushToken = tokenData.data;
    return tokenData.data;
  } catch (e) {
    console.error("Error getting push token:", e);
    return null;
  }
}

// 🔹 Get cached token (if previously registered)
export function getCachedPushToken(): string | null {
  return cachedPushToken;
}

// 🔹 Add listener for foreground notifications
export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(listener);
}

// 🔹 Add listener for when user taps a notification
export function addNotificationResponseReceivedListener(
  listener: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

// 🕐 Schedule a local (one-time) notification
export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds = 1
) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    } as any,
  });
}

// --- Daily reminder helpers (optional) ---
const DAILY_REMINDER_ID_KEY = "DAILY_REMINDER_ID";
const DAILY_REMINDER_TIME_KEY = "DAILY_REMINDER_TIME";

export async function scheduleDailyReminder(
  hour = 9,
  minute = 0,
  title = "Keep Learning!",
  body = "Time to practice a little today — keep learning!"
) {
  try {
    const existing = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    if (existing) return existing;

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("Permissions not granted for scheduling daily reminders");
      return null;
    }

    if (Device.osName?.toLowerCase?.().includes("android")) {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, channelId: "default" } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      } as any,
    });

    await AsyncStorage.setItem(DAILY_REMINDER_ID_KEY, id);
    await AsyncStorage.setItem(
      DAILY_REMINDER_TIME_KEY,
      JSON.stringify({ hour, minute })
    );

    return id;
  } catch (e) {
    console.error("Failed to schedule daily reminder:", e);
    return null;
  }
}

export async function cancelDailyReminder() {
  try {
    const id = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    if (!id) return false;
    await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(DAILY_REMINDER_ID_KEY);
    await AsyncStorage.removeItem(DAILY_REMINDER_TIME_KEY);
    return true;
  } catch (e) {
    console.error("Failed to cancel daily reminder:", e);
    return false;
  }
}

export async function getDailyReminderTime(): Promise<{
  hour: number;
  minute: number;
} | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_REMINDER_TIME_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read daily reminder time:", e);
    return null;
  }
}
