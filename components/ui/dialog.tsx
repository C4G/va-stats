"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type { ButtonHTMLAttributes, ComponentProps, ElementType, HTMLAttributes } from "react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

type ClassedProps<T extends ElementType> = Omit<ComponentProps<T>, "className"> & { className?: string };

export function DialogBackdrop({ className = "", ...props }: ClassedProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      className={`fixed inset-0 z-[2000] min-h-dvh bg-black/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 ${className}`}
      {...props}
    />
  );
}

export function DialogViewport({ className = "", ...props }: ClassedProps<typeof DialogPrimitive.Viewport>) {
  return (
    <DialogPrimitive.Viewport
      className={`fixed inset-0 z-[2001] flex items-center justify-center overflow-y-auto p-4 outline-none ${className}`}
      {...props}
    />
  );
}

export function DialogPopup({ className = "", ...props }: ClassedProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Popup
      className={`pointer-events-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-lg border border-slate-300 bg-white p-6 text-slate-950 shadow-xl outline-none transition data-[ending-style]:translate-y-1 data-[starting-style]:translate-y-1 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 ${className}`}
      {...props}
    />
  );
}

export function DialogHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col gap-1 ${className}`} {...props} />;
}

export function DialogFooter({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col justify-end gap-2 sm:flex-row ${className}`} {...props} />;
}

export function DialogTitle({ className = "", ...props }: ClassedProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={`text-lg font-semibold leading-6 ${className}`} {...props} />;
}

export function DialogDescription({ className = "", ...props }: ClassedProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={`text-sm leading-5 text-slate-700 ${className}`} {...props} />;
}

interface DialogButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
}

export function DialogButton({ variant = "primary", className = "", type = "button", ...props }: DialogButtonProps) {
  const variantClasses =
    variant === "outline"
      ? "border border-slate-400 bg-white text-slate-900 hover:bg-slate-100"
      : "border border-blue-700 bg-blue-700 text-white hover:bg-blue-800";

  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:pointer-events-none disabled:opacity-50 ${variantClasses} ${className}`}
      {...props}
    />
  );
}
