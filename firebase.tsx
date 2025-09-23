// Import the functions you need from the SDKs you need
import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAL6_3ZXvrkozgRkWuptycRbcTk0-vJLDI",
  authDomain: "learning-kids-6ce5d.firebaseapp.com",
  projectId: "learning-kids-6ce5d",
  storageBucket: "learning-kids-6ce5d.firebasestorage.app",
  messagingSenderId: "904046589825",
  appId: "1:904046589825:web:591d20c1b55cdf515a5a80",
  measurementId: "G-C213E8RJQ3",
};

// Create (or reuse) the app
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Create (or reuse) the Auth instance safely across hot reloads
let _auth: Auth;
if (Platform.OS === "web") {
  _auth = getAuth(app);
} else {
  // Avoid "already-initialized" on native + Fast Refresh
  // @ts-ignore
  if (!globalThis.__FIREBASE_AUTH__) {
    // @ts-ignore
    globalThis.__FIREBASE_AUTH__ = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
  // @ts-ignore
  _auth = globalThis.__FIREBASE_AUTH__;
}
export const auth = _auth;

// Only init Analytics on web, and only if supported
export async function initAnalyticsWeb() {
  if (Platform.OS !== "web") return null;
  const { isSupported, getAnalytics } = await import("firebase/analytics");
  if (await isSupported()) return getAnalytics(app);
  return null;
}