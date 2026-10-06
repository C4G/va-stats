"use client";

import { Toast } from "@base-ui/react/toast";

export type ToastSeverity = "success" | "info" | "warning" | "error";

const severityBorderColors: Record<ToastSeverity, string> = {
  success: "#16a34a",
  info: "#2563eb",
  warning: "#f59e0b",
  error: "#dc2626",
};

export function ToastViewport() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport
        aria-label="Notifications"
        className="fixed right-4 top-4 z-[2000] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3 outline-none"
      >
        {toasts.map((toast) => {
          const severity =
            toast.type === "success" || toast.type === "info" || toast.type === "warning" || toast.type === "error"
              ? toast.type
              : "info";

          return (
            <Toast.Root
              key={toast.id}
              toast={toast}
              className="pointer-events-auto rounded-md border border-slate-300 bg-white p-4 text-slate-950 shadow-lg transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
              style={{ borderLeft: `4px solid ${severityBorderColors[severity]}` }}
            >
              <Toast.Content className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Toast.Title className="m-0 text-sm font-semibold" />
                  <Toast.Description className="mt-1 text-sm leading-5" />
                </div>
                <Toast.Close
                  aria-label="Dismiss notification"
                  className="shrink-0 cursor-pointer appearance-none rounded-md border-0 bg-transparent px-2 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:bg-slate-200"
                >
                  Dismiss
                </Toast.Close>
              </Toast.Content>
            </Toast.Root>
          );
        })}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
