"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

/* ------------------------------------------------------------------
   Context
   ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ------------------------------------------------------------------
   Provider + Renderer
   ------------------------------------------------------------------ */

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2" style={{ maxWidth: 420 }}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------
   Toast Item
   ------------------------------------------------------------------ */

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const Icon = toast.variant === "success" ? CheckCircle
    : toast.variant === "error" ? AlertCircle
    : Info;

  const colorClass = toast.variant === "success"
    ? "border-editorial-green/40 bg-editorial-green/10 text-editorial-green"
    : toast.variant === "error"
    ? "border-editorial-red/40 bg-editorial-red/10 text-editorial-red"
    : "border-rule bg-surface-card text-ink";

  const iconColor = toast.variant === "success"
    ? "text-editorial-green"
    : toast.variant === "error"
    ? "text-editorial-red"
    : "text-ink-muted";

  return (
    <div
      className={cn(
        "flex items-start gap-3 border px-4 py-3 shadow-lg transition-all duration-300",
        colorClass,
        exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      )}
      role="alert"
    >
      <Icon size={16} className={cn("mt-0.5 shrink-0", iconColor)} />
      <p className="flex-1 font-sans text-[12px] leading-relaxed">{toast.message}</p>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="shrink-0 p-0.5 text-ink-muted transition-colors hover:text-ink"
      >
        <X size={12} />
      </button>
    </div>
  );
}
