import { Platform } from "react-native";
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCc9KC1ullkBvjHq7afMq6tA9Ck94Qv5YY",
  authDomain: "codespark-learning-app.firebaseapp.com",
  projectId: "codespark-learning-app",
  storageBucket: "codespark-learning-app.firebasestorage.app",
  messagingSenderId: "226601938248",
  appId: "1:226601938248:web:1dd0f1d5cdd9df26cf177d",
  measurementId: "G-HTR4MZ4E5G"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authInstance;

if (Platform.OS === "web") {
  authInstance = getAuth(app);
} else {
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
export const db = getFirestore(app);