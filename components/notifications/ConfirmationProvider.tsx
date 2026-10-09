"use client";

import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  AlertDialogAction,
  AlertDialogBackdrop,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogViewport,
} from "@/components/ui/alert-dialog";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from "react";

const DIALOG_EXIT_ANIMATION_MS = 200;

export interface ConfirmOptions {
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  cancelDestructive?: boolean;
  initialFocus?: "cancel" | "confirm";
  escapeResult?: boolean;
  focusTarget?: (confirmed: boolean) => HTMLElement | null;
}

type Confirm = (message: string, options: ConfirmOptions) => Promise<boolean>;

interface ConfirmationRequest {
  message: string;
  options: ConfirmOptions;
  returnFocus: HTMLElement | null;
  confirmed?: boolean;
  resolve: (confirmed: boolean) => void;
}

const ConfirmationContext = createContext<Confirm | null>(null);

export function ConfirmationProvider({ children }: PropsWithChildren) {
  const [activeRequest, setActiveRequest] = useState<ConfirmationRequest | null>(null);
  const activeRequestRef = useRef<ConfirmationRequest | null>(null);
  const closingRequestRef = useRef<ConfirmationRequest | null>(null);
  const queuedRequestsRef = useRef<ConfirmationRequest[]>([]);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    []
  );

  const activateRequest = useCallback((request: ConfirmationRequest) => {
    activeRequestRef.current = request;
    setActiveRequest(request);
  }, []);

  const confirm = useCallback<Confirm>(
    (message, options) =>
      new Promise((resolve) => {
        const returnFocus =
          typeof document !== "undefined" && document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const request = { message, options, returnFocus, resolve };

        if (activeRequestRef.current || closingRequestRef.current) {
          queuedRequestsRef.current.push(request);
        } else {
          activateRequest(request);
        }
      }),
    [activateRequest]
  );

  const finishRequest = useCallback(
    (confirmed: boolean) => {
      const request = activeRequestRef.current;
      if (!request) return;

      activeRequestRef.current = null;
      closingRequestRef.current = request;
      request.confirmed = confirmed;
      request.resolve(confirmed);
      setActiveRequest(null);

      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        closingRequestRef.current = null;
        const nextRequest = queuedRequestsRef.current.shift();
        if (nextRequest) activateRequest(nextRequest);
      }, DIALOG_EXIT_ANIMATION_MS);
    },
    [activateRequest]
  );

  const displayedRequest = activeRequest ?? closingRequestRef.current;

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={activeRequest !== null}
        onOpenChange={(open, eventDetails) => {
          if (!open) {
            const request = activeRequestRef.current;
            const escapeResult = eventDetails.reason === "escape-key" ? request?.options.escapeResult : undefined;
            finishRequest(escapeResult ?? false);
          }
        }}
      >
        {displayedRequest ? (
          <AlertDialogPortal>
            <AlertDialogBackdrop />
            <AlertDialogViewport>
              <AlertDialogPopup
                initialFocus={displayedRequest.options.initialFocus === "confirm" ? confirmRef : cancelRef}
                finalFocus={() => {
                  const request = closingRequestRef.current ?? activeRequestRef.current;
                  if (!request) return false;

                  try {
                    const workflowTarget = request.options.focusTarget?.(request.confirmed ?? false);
                    if (workflowTarget?.isConnected && !workflowTarget.hasAttribute("disabled")) {
                      return workflowTarget;
                    }
                  } catch {
                    // Fall back to the invoking control if the workflow target is no longer available.
                  }

                  if (request.returnFocus?.isConnected && !request.returnFocus.hasAttribute("disabled")) {
                    return request.returnFocus;
                  }
                  return false;
                }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>{displayedRequest.options.title}</AlertDialogTitle>
                  <AlertDialogDescription>{displayedRequest.message}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel ref={cancelRef} destructive={displayedRequest.options.cancelDestructive}>
                    {displayedRequest.options.cancelLabel ?? "Cancel"}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    ref={confirmRef}
                    destructive={displayedRequest.options.destructive}
                    onClick={() => finishRequest(true)}
                  >
                    {displayedRequest.options.confirmLabel}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogPopup>
            </AlertDialogViewport>
          </AlertDialogPortal>
        ) : null}
      </AlertDialog>
    </ConfirmationContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) {
    throw new Error("useConfirm must be used inside ConfirmationProvider");
  }
  return confirm;
}
