import {
  Dialog,
  DialogBackdrop,
  DialogButton,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogViewport,
} from "@/components/ui/dialog";
import type { ReactNode } from "react";
import { useRef } from "react";

interface RegistrationResultDialogProps {
  open: boolean;
  title: ReactNode;
  summaryData: Record<string, ReactNode>;
  labelMap: Record<string, string>;
  onDownload: () => void;
  onComplete: () => void;
}

export function RegistrationResultDialog({
  open,
  title,
  summaryData,
  labelMap,
  onDownload,
  onComplete,
}: RegistrationResultDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  return (
    <Dialog
      open={open}
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && open) onComplete();
      }}
    >
      {open && (
        <DialogPortal>
          <DialogBackdrop />
          <DialogViewport>
            <DialogPopup initialFocus={titleRef}>
              <DialogHeader>
                <DialogTitle
                  ref={titleRef}
                  tabIndex={-1}
                  className="rounded-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-700"
                >
                  {title}
                </DialogTitle>
                <DialogDescription>
                  Registration summary. Review the submitted details below or download a CSV copy.
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-64 overflow-y-auto rounded-md bg-slate-50 p-4">
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {Object.entries(summaryData).map(([key, value]) => (
                    <li key={key}>
                      <strong>{labelMap[key] || key}:</strong> {value || "-"}
                    </li>
                  ))}
                </ul>
              </div>

              <DialogFooter>
                <DialogButton variant="outline" onClick={onDownload}>
                  Download registration details
                </DialogButton>
                <DialogClose
                  aria-label="Close registration summary"
                  className="min-h-10 rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Close
                </DialogClose>
                <DialogButton onClick={onComplete}>Finish registration</DialogButton>
              </DialogFooter>
            </DialogPopup>
          </DialogViewport>
        </DialogPortal>
      )}
    </Dialog>
  );
}
