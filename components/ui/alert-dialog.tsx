"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type { ButtonHTMLAttributes, ComponentProps, ElementType, HTMLAttributes, Ref } from "react";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

type ClassedProps<T extends ElementType> = Omit<ComponentProps<T>, "className"> & { className?: string };

export function AlertDialogBackdrop({ className = "", ...props }: ClassedProps<typeof AlertDialogPrimitive.Backdrop>) {
  return (
    <AlertDialogPrimitive.Backdrop
      className={`fixed inset-0 z-[2000] min-h-dvh bg-black/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 ${className}`}
      {...props}
    />
  );
}

export function AlertDialogViewport({ className = "", ...props }: ClassedProps<typeof AlertDialogPrimitive.Viewport>) {
  return (
    <AlertDialogPrimitive.Viewport
      className={`fixed inset-0 z-[2001] flex items-center justify-center overflow-y-auto p-4 outline-none ${className}`}
      {...props}
    />
  );
}

export function AlertDialogPopup({ className = "", ...props }: ClassedProps<typeof AlertDialogPrimitive.Popup>) {
  return (
    <AlertDialogPrimitive.Popup
      className={`pointer-events-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-lg border border-slate-300 bg-white p-6 text-slate-950 shadow-xl outline-none transition data-[ending-style]:translate-y-1 data-[starting-style]:translate-y-1 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 ${className}`}
      {...props}
    />
  );
}

export function AlertDialogHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col gap-1 ${className}`} {...props} />;
}

export function AlertDialogFooter({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col justify-end gap-2 sm:flex-row ${className}`} {...props} />;
}

export function AlertDialogTitle({ className = "", ...props }: ClassedProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={`text-lg font-semibold leading-6 ${className}`} {...props} />;
}

export function AlertDialogDescription({
  className = "",
  ...props
}: ClassedProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={`whitespace-pre-line text-sm leading-5 text-slate-700 ${className}`}
      {...props}
    />
  );
}

const buttonClasses =
  "inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:pointer-events-none disabled:opacity-50";

interface AlertDialogCancelProps extends ClassedProps<typeof AlertDialogPrimitive.Close> {
  destructive?: boolean;
}

export function AlertDialogCancel({ destructive = false, className = "", ...props }: AlertDialogCancelProps) {
  const cancelClasses = destructive
    ? "border-red-700 bg-white text-red-800 hover:bg-red-50 focus-visible:outline-red-800"
    : "border-slate-400 bg-white text-slate-900 hover:bg-slate-100";

  return <AlertDialogPrimitive.Close className={`${buttonClasses} ${cancelClasses} ${className}`} {...props} />;
}

interface AlertDialogActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  destructive?: boolean;
}

export function AlertDialogAction({
  destructive = false,
  className = "",
  type = "button",
  ref,
  ...props
}: AlertDialogActionProps) {
  const actionClasses = destructive
    ? "border-red-700 bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-800"
    : "border-blue-700 bg-blue-700 text-white hover:bg-blue-800 focus-visible:outline-blue-800";

  return <button ref={ref} type={type} className={`${buttonClasses} ${actionClasses} ${className}`} {...props} />;
}
