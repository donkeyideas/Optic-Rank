"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Dialog Context
   ------------------------------------------------------------------ */
interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog compound components must be used within <Dialog>");
  }
  return ctx;
}

/* ------------------------------------------------------------------
   Dialog (root)
   ------------------------------------------------------------------ */
interface DialogProps {
  /** Whether the dialog is open */
  open?: boolean;
  /** Called when the open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Controlled default open state */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Dialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  children,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setUncontrolledOpen;

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}
Dialog.displayName = "Dialog";

/* ------------------------------------------------------------------
   DialogTrigger
   ------------------------------------------------------------------ */
interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ onClick, children, ...props }, ref) => {
    const { onOpenChange } = useDialogContext();

    return (
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          onClick?.(e);
          onOpenChange(true);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = "DialogTrigger";

/* ------------------------------------------------------------------
   DialogOverlay
   ------------------------------------------------------------------ */
interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogOverlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "fixed inset-0 z-50",
        "bg-ink/60 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  )
);
DialogOverlay.displayName = "DialogOverlay";

/* ------------------------------------------------------------------
   DialogContent
   ------------------------------------------------------------------ */
interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Hide the default close button */
  hideClose?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, hideClose = false, ...props }, ref) => {
    const { open, onOpenChange } = useDialogContext();
    const dialogRef = React.useRef<HTMLDialogElement>(null);

    // Sync native dialog with React state
    React.useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (open) {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else {
        if (dialog.open) {
          dialog.close();
        }
      }
    }, [open]);

    // Handle native close (Escape key, etc.)
    React.useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const handleClose = () => {
        onOpenChange(false);
      };

      dialog.addEventListener("close", handleClose);
      return () => dialog.removeEventListener("close", handleClose);
    }, [onOpenChange]);

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onOpenChange(false);
      }
    };

    if (!open) return null;

    return (
      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className={cn(
          // Reset native dialog styles
          "p-0 m-auto bg-transparent border-none",
          "[color-scheme:normal] text-ink",
          "backdrop:bg-ink/60 backdrop:backdrop-blur-sm",
          // Overlay + centering via grid on the ::backdrop handled by the dialog
          "open:flex open:items-center open:justify-center",
          "max-h-[85vh] max-w-lg w-[calc(100%-2rem)] sm:w-full",
        )}
      >
        <div
          ref={ref}
          className={cn(
            "relative w-full",
            "bg-surface-card text-ink border border-rule rounded-none",
            "shadow-xl",
            className
          )}
          {...props}
        >
          {children}
          {!hideClose && (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                "absolute right-4 top-4",
                "inline-flex items-center justify-center",
                "h-8 w-8 sm:h-6 sm:w-6",
                "text-ink-muted hover:text-ink",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-editorial-red",
              )}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </dialog>
    );
  }
);
DialogContent.displayName = "DialogContent";

/* ------------------------------------------------------------------
   DialogHeader
   ------------------------------------------------------------------ */
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-1.5 p-4 sm:p-5 pb-3",
        "border-b border-rule",
        className
      )}
      {...props}
    />
  )
);
DialogHeader.displayName = "DialogHeader";

/* ------------------------------------------------------------------
   DialogTitle
   ------------------------------------------------------------------ */
interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(
        "font-serif font-bold text-lg leading-tight text-ink",
        className
      )}
      {...props}
    />
  )
);
DialogTitle.displayName = "DialogTitle";

/* ------------------------------------------------------------------
   DialogDescription
   ------------------------------------------------------------------ */
interface DialogDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-ink-secondary leading-relaxed", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

/* ------------------------------------------------------------------
   DialogFooter
   ------------------------------------------------------------------ */
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 p-4 sm:p-5 pt-3",
        "border-t border-rule",
        className
      )}
      {...props}
    />
  )
);
DialogFooter.displayName = "DialogFooter";

export {
  Dialog,
  DialogTrigger,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
export type {
  DialogProps,
  DialogTriggerProps,
  DialogOverlayProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogTitleProps,
  DialogDescriptionProps,
  DialogFooterProps,
};
