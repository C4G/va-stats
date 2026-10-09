import { useRef } from "react";
import {
  AlertDialog,
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

interface ConfirmationModalProps {
  open: boolean;
  handleClose: () => void;
  handleConfirm: () => void | Promise<void>;
  title?: unknown;
  message?: string;
  confirmColor?: string;
  confirmLabel?: string;
  returnFocusTarget?: () => HTMLElement | null;
  fallbackFocus?: () => HTMLElement | null;
}

const ConfirmationModal = ({
  open,
  handleClose,
  handleConfirm,
  title,
  message,
  confirmColor,
  confirmLabel,
  returnFocusTarget,
  fallbackFocus,
}: ConfirmationModalProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  if (open && !wasOpenRef.current && typeof document !== "undefined") {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpenRef.current = open;

  const titleContent =
    typeof title === "string" || typeof title === "number" || title == null ? title : "Confirm action";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogViewport>
          <AlertDialogPopup
            initialFocus={cancelRef}
            finalFocus={() => {
              const preferredTarget = returnFocusTarget?.();
              if (preferredTarget?.isConnected) return preferredTarget;
              if (returnFocusRef.current?.isConnected) return returnFocusRef.current;
              const fallback = fallbackFocus?.();
              return fallback?.isConnected ? fallback : false;
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{titleContent || "Confirm action"}</AlertDialogTitle>
              <AlertDialogDescription>{message || "Are you sure you want to proceed?"}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel ref={cancelRef}>Cancel</AlertDialogCancel>
              <AlertDialogAction destructive={confirmColor === "error"} onClick={handleConfirm}>
                {confirmLabel || (confirmColor === "error" ? "Delete" : "Continue")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialogViewport>
      </AlertDialogPortal>
    </AlertDialog>
  );
};

export default ConfirmationModal;
