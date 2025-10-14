
import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const firebaseConfig = {
  apiKey: "AIzaSyAL6_3ZXvrkozgRkWuptycRbcTk0-vJLDI",
  authDomain: "learning-kids-6ce5d.firebaseapp.com",
  projectId: "learning-kids-6ce5d",
  storageBucket: "learning-kids-6ce5d.firebasestorage.app",
  messagingSenderId: "904046589825",
  appId: "1:904046589825:web:591d20c1b55cdf515a5a80",
  measurementId: "G-C213E8RJQ3",
};


export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);


let _auth: Auth;
if (Platform.OS === "web") {
  _auth = getAuth(app);
} else {

  if (!globalThis.__FIREBASE_AUTH__) {

    globalThis.__FIREBASE_AUTH__ = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }

  _auth = globalThis.__FIREBASE_AUTH__;
}
export const auth = _auth;


export async function initAnalyticsWeb() {

  return null;
}