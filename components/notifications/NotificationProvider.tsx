"use client";

import { Toast } from "@base-ui/react/toast";
import { createContext, type PropsWithChildren, useCallback, useContext, useRef } from "react";
import { ToastViewport, type ToastSeverity } from "@/components/ui/toast";

type PendingNotification = {
  id: string;
  message: string;
  severity: ToastSeverity;
};

type Notify = (message: string, severity?: ToastSeverity) => void;

const NOTIFICATION_TIMEOUT_MS = 5_000;

const NotificationContext = createContext<Notify | null>(null);

const severityLabels: Record<ToastSeverity, string> = {
  success: "Success",
  info: "Information",
  warning: "Warning",
  error: "Error",
};

export function NotificationProvider({ children }: PropsWithChildren) {
  return (
    <Toast.Provider timeout={NOTIFICATION_TIMEOUT_MS} limit={1}>
      <NotificationController>{children}</NotificationController>
    </Toast.Provider>
  );
}

function NotificationController({ children }: PropsWithChildren) {
  const { add } = Toast.useToastManager();
  const pendingNotifications = useRef<PendingNotification[]>([]);
  const activeNotificationId = useRef<string | null>(null);
  const nextId = useRef(0);
  const processQueueRef = useRef<() => void>(() => {});

  const processNextNotification = useCallback(() => {
    if (activeNotificationId.current || pendingNotifications.current.length === 0) return;

    const notification = pendingNotifications.current.shift();
    if (!notification) return;

    activeNotificationId.current = notification.id;
    add({
      id: notification.id,
      title: severityLabels[notification.severity],
      description: notification.message,
      type: notification.severity,
      priority: notification.severity === "error" ? "high" : "low",
      timeout: NOTIFICATION_TIMEOUT_MS,
      onRemove: () => {
        if (activeNotificationId.current === notification.id) {
          activeNotificationId.current = null;
        }
        queueMicrotask(() => processQueueRef.current());
      },
    });
  }, [add]);

  processQueueRef.current = processNextNotification;

  const notify = useCallback<Notify>((message, severity = "success") => {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) return;

    pendingNotifications.current.push({
      id: `application-notification-${nextId.current++}`,
      message: normalizedMessage,
      severity,
    });
    processQueueRef.current();
  }, []);

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <ToastViewport />
    </NotificationContext.Provider>
  );
}

export function useNotification(): Notify {
  const notify = useContext(NotificationContext);
  if (!notify) {
    throw new Error("useNotification must be used inside NotificationProvider");
  }
  return notify;
}
