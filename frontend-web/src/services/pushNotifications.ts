import type { MessagePayload, Messaging } from "firebase/messaging";
import { getToken, onMessage } from "firebase/messaging";

import { getFirebaseMessagingInstance } from "../lib/firebase";

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("[PWA] Notifications API is not available in this environment.");
    return "denied";
  }

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

export async function registerPushNotifications(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("[PWA] Service Worker support is required for push notifications.");
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return null;
  }

  const messaging = await getFirebaseMessagingInstance();
  if (!messaging) {
    return null;
  }

  try {
    if (!vapidKey) {
      console.warn("[PWA] Missing VITE_FIREBASE_VAPID_KEY environment variable.");
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("[PWA] Firebase returned an empty token.");
      return null;
    }

    console.info("[PWA] Push notifications enabled.");
    return token;
  } catch (error) {
    console.error("[PWA] Unable to obtain push token.", error);
    return null;
  }
}

export function listenToForegroundNotifications(handler: (payload: MessagePayload) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  void getFirebaseMessagingInstance().then((messaging: Messaging | null) => {
    if (!messaging) {
      return;
    }
    unsubscribe = onMessage(messaging, handler);
  });

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}

export async function sendLocalNotification(
  title: string,
  options?: NotificationOptions,
): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: "TRIGGER_LOCAL_NOTIFICATION",
      payload: {
        title,
        options,
      },
    });
    return true;
  } catch (error) {
    console.error("[PWA] Unable to show local notification.", error);
    return false;
  }
}
