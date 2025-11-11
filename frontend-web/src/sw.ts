/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import type { RouteHandlerCallbackOptions } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute, type PrecacheEntry } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry>;
};

const OFFLINE_URL = "/offline.html";
const FALLBACK_NOTIFICATION_ICON = "/icons/icon-192.png";

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      await clientsClaim();
    })(),
  );
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

type NavigationHandlerOptions = RouteHandlerCallbackOptions & {
  preloadResponse?: Promise<Response | undefined>;
};

registerRoute(
  new NavigationRoute(async (options: NavigationHandlerOptions) => {
    const { request, preloadResponse } = options;
    try {
      const response = await preloadResponse;
      if (response) {
        return response;
      }

      const networkResponse = await fetch(request);
      return networkResponse;
    } catch (error) {
      console.warn("[PWA] Falling back to offline page due to:", error);
      const cachedResponse = await caches.match(OFFLINE_URL, { ignoreSearch: true });
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response("Sin conexion y sin cache disponible.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }),
);

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/icons/"),
  new CacheFirst({
    cacheName: "pwa-icons",
  }),
);

registerRoute(
  ({ request, url }) => request.destination === "image" && url.origin !== self.location.origin,
  new StaleWhileRevalidate({
    cacheName: "remote-images",
    plugins: [],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 10,
    plugins: [],
  }),
  "GET",
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
    return;
  }

  if (event.data?.type === "TRIGGER_LOCAL_NOTIFICATION") {
    const { title, options } = event.data.payload ?? {};
    if (!title) {
      return;
    }

    event.waitUntil(
      self.registration.showNotification(title, {
        icon: FALLBACK_NOTIFICATION_ICON,
        badge: FALLBACK_NOTIFICATION_ICON,
        ...options,
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = (() => {
    try {
      return event.data!.json();
    } catch {
      return { title: "SmartSales365", body: event.data!.text() };
    }
  })();

  const title = payload.title ?? payload.notification?.title ?? "SmartSales365";
  const body = payload.body ?? payload.notification?.body ?? "Tienes novedades en tus ventas.";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: payload.icon ?? payload.notification?.icon ?? FALLBACK_NOTIFICATION_ICON,
      data: payload.data ?? {},
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = clientList.find((existingClient) => existingClient.url.includes(self.location.origin));
      if (client) {
        await client.focus();
        client.postMessage({ type: "NAVIGATE_TO", payload: { url: targetUrl } });
        return;
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every((value) => Boolean(value));

if (hasFirebaseConfig) {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    const messaging = getMessaging(firebaseApp);
    onBackgroundMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? "SmartSales365";
      const body = payload.notification?.body ?? "Nueva notificacion disponible.";
      const icon = payload.notification?.icon ?? FALLBACK_NOTIFICATION_ICON;

      self.registration.showNotification(title, {
        body,
        icon,
        data: payload.data,
      });
    });
  } catch (error) {
    console.warn("[PWA] Firebase background notifications not available:", error);
  }
} else {
  console.warn("[PWA] Firebase config not found, background notifications disabled.");
}
