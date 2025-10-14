import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Must use physical device for Push Notifications");
    return null;
  }

  
  try {
    if (Device.osName?.toLowerCase?.().includes('android')) {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  } catch (e) {
    console.warn('Could not create Android notification channel:', e);
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Failed to get push token for push notification!");
    return null;
  }

  try {
  const expoProjectId = (Constants.expoConfig as any)?.projectId ?? (Constants.manifest as any)?.projectId;
    const options = expoProjectId ? { projectId: expoProjectId } : undefined;
    if (!expoProjectId) {
      console.warn('Expo projectId not found in app config. Skipping remote push token registration. To enable remote pushes, set a valid UUID at expo.projectId in app.json.');
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync(options as any);
    
    cachedPushToken = tokenData.data;
    return tokenData.data;
  } catch (e) {
    console.error("Error getting push token:", e);
    return null;
  }
}

let cachedPushToken: string | null = null;

export function getCachedPushToken(): string | null {
  return cachedPushToken;
}

export function addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(listener);
}

export function addNotificationResponseReceivedListener(listener: (response: Notifications.NotificationResponse) => void) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

export async function scheduleLocalNotification(title: string, body: string, seconds = 1) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false } as any,
  });
}


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

    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("Permissions not granted for scheduling daily reminders");
      return null;
    }

    
    try {
      if (Device.osName?.toLowerCase?.().includes('android')) {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (e) {
      console.warn('Could not ensure Android notification channel:', e);
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, channelId: 'default' } as any,
      
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute } as any,
    });

  await AsyncStorage.setItem(DAILY_REMINDER_ID_KEY, id);
  
  await AsyncStorage.setItem(DAILY_REMINDER_TIME_KEY, JSON.stringify({ hour, minute }));
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

export async function isDailyReminderScheduled() {
  try {
    const id = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    return !!id;
  } catch (e) {
    console.error("Failed to check daily reminder:", e);
    return false;
  }
}

export async function getDailyReminderTime(): Promise<{ hour: number; minute: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_REMINDER_TIME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { hour: number; minute: number };
  } catch (e) {
    console.error("Failed to read daily reminder time:", e);
    return null;
  }
}
