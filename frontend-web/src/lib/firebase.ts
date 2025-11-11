import type { FirebaseApp } from "firebase/app";
import { initializeApp } from "firebase/app";
import type { Messaging } from "firebase/messaging";
import { getMessaging, isSupported } from "firebase/messaging";

let firebaseApp: FirebaseApp | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every((value) => Boolean(value));

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseConfig) {
    console.warn("[PWA] Firebase config is incomplete. Push notifications are disabled.");
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

export async function getFirebaseMessagingInstance(): Promise<Messaging | null> {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn("[PWA] This browser does not support Firebase Cloud Messaging.");
    return null;
  }

  return getMessaging(app);
}
