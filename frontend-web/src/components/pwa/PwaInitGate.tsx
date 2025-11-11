import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { registerPushNotifications, requestNotificationPermission, sendLocalNotification } from "../../services/pushNotifications";

const canUseNotifications = typeof window !== "undefined" && "Notification" in window;

export function PwaInitGate() {
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(
    canUseNotifications && Notification.permission === "granted",
  );
  const [notificationPromptVisible, setNotificationPromptVisible] = useState<boolean>(
    canUseNotifications && Notification.permission === "default",
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl) {
      console.info(`[PWA] Service Worker registered: ${swUrl}`);
    },
    onRegisterError(error) {
      console.error("[PWA] Service Worker registration failed:", error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      setStatusMessage("SmartSales365 esta listo para usarse sin conexion.");
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      setStatusMessage("Hay una actualizacion disponible. Recarga para obtener las ultimas mejoras.");
    }
  }, [needRefresh]);

  const showBanner = useMemo(() => Boolean(statusMessage), [statusMessage]);

  const closeBanner = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setStatusMessage(null);
  };

  const handleReload = () => {
    updateServiceWorker(true);
    closeBanner();
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    const granted = permission === "granted";
    setNotificationEnabled(granted);
    setNotificationPromptVisible(false);

    if (!granted) {
      return;
    }

    const token = await registerPushNotifications();
    if (!token) {
      return;
    }
    void sendLocalNotification("SmartSales365", {
      body: "Te avisaremos sobre pedidos y promociones, incluso cuando estes fuera de linea.",
      icon: "/icons/icon-192.png",
    });
  };

  if (!showBanner && !notificationPromptVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 60,
        maxWidth: "360px",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      {showBanner ? (
        <div style={cardStyle}>
          <p style={textStyle}>{statusMessage}</p>
          <div style={actionsStyle}>
            {needRefresh ? (
              <button type="button" style={primaryButtonStyle} onClick={handleReload}>
                Recargar
              </button>
            ) : (
              <button type="button" style={primaryButtonStyle} onClick={closeBanner}>
                Entendido
              </button>
            )}
            <button type="button" style={ghostButtonStyle} onClick={closeBanner}>
              Cerrar
            </button>
          </div>
        </div>
      ) : null}

      {notificationPromptVisible && !notificationEnabled ? (
        <div style={cardStyle}>
          <p style={textStyle}>
            Activa las notificaciones push para enterarte de pedidos y promociones incluso cuando la app este cerrada.
          </p>
          <button type="button" style={primaryButtonStyle} onClick={handleEnableNotifications}>
            Activar notificaciones
          </button>
        </div>
      ) : null}
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: "18px",
  padding: "1rem 1.25rem",
  color: "#f8fafc",
  boxShadow: "0 24px 45px rgba(2, 6, 23, 0.6)",
  backdropFilter: "blur(12px)",
};

const textStyle: CSSProperties = {
  margin: 0,
  marginBottom: "0.75rem",
  fontSize: "0.95rem",
  lineHeight: 1.3,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  flexWrap: "wrap",
};

const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: "999px",
  padding: "0.65rem 1.25rem",
  fontWeight: 600,
  cursor: "pointer",
  background: "linear-gradient(135deg, #38bdf8, #22d3ee)",
  color: "#0f172a",
  flex: "0 0 auto",
};

const ghostButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: "transparent",
  color: "#e2e8f0",
  border: "1px solid rgba(148, 163, 184, 0.5)",
};
