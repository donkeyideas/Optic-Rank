"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface ActionConfig {
  title: string;
  description?: string;
  successMessage?: string;
}

type ActionStatus = "idle" | "running" | "success" | "error";

interface ActionProgressContextValue {
  runAction: <T>(
    config: ActionConfig,
    fn: () => Promise<T>
  ) => Promise<T | undefined>;
  isRunning: boolean;
}

/* ------------------------------------------------------------------
   Context
   ------------------------------------------------------------------ */

const ActionProgressContext =
  createContext<ActionProgressContextValue | null>(null);

export function useActionProgress() {
  const ctx = useContext(ActionProgressContext);
  if (!ctx)
    throw new Error(
      "useActionProgress must be used within <ActionProgressProvider>"
    );
  return ctx;
}

/* ------------------------------------------------------------------
   Provider + Modal
   ------------------------------------------------------------------ */

export function ActionProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Elapsed time counter
  useEffect(() => {
    if (status === "running") {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Auto-close on success
  useEffect(() => {
    if (status === "success") {
      autoCloseRef.current = setTimeout(() => {
        setStatus("idle");
      }, 3000);
    }
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, [status]);

  const runAction = useCallback(
    async <T,>(
      config: ActionConfig,
      fn: () => Promise<T>
    ): Promise<T | undefined> => {
      // Set up modal
      setTitle(config.title);
      setDescription(config.description ?? "Please wait...");
      setResultMessage("");
      setErrorMessage("");
      setStatus("running");

      try {
        const result = await fn();

        // Check for { error: string } pattern from server actions
        if (
          result &&
          typeof result === "object" &&
          "error" in (result as Record<string, unknown>)
        ) {
          const err = (result as Record<string, unknown>).error as string;
          setErrorMessage(err);
          setStatus("error");
          return result;
        }

        // Build success message
        let successMsg = config.successMessage ?? "Completed successfully";
        if (result && typeof result === "object") {
          const r = result as Record<string, unknown>;
          // Common patterns from server actions
          if ("added" in r && typeof r.added === "number") {
            successMsg = `Added ${r.added} items`;
          }
          if ("discovered" in r && typeof r.discovered === "number") {
            successMsg = `Discovered ${r.discovered} items`;
          }
          if ("crawled" in r && typeof r.crawled === "number") {
            successMsg = `Crawled ${r.crawled} pages`;
            if ("discovered" in r) {
              successMsg += `, discovered ${r.discovered} items`;
            }
          }
          if ("issueCount" in r && typeof r.issueCount === "number") {
            successMsg = `Audit complete — ${r.issueCount} issues found`;
          }
          if ("count" in r && typeof r.count === "number") {
            successMsg = `Generated ${r.count} items`;
          }
          if ("message" in r && typeof r.message === "string") {
            successMsg = r.message;
          }
        }

        setResultMessage(successMsg);
        setStatus("success");
        return result;
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setStatus("error");
        return undefined;
      }
    },
    []
  );

  const isRunning = status === "running";

  function handleClose() {
    if (status !== "running") {
      setStatus("idle");
    }
  }

  function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  return (
    <ActionProgressContext.Provider value={{ runAction, isRunning }}>
      {children}

      <Dialog
        open={status !== "idle"}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent hideClose={status === "running"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {status === "running" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-editorial-red/10">
                  <Loader2
                    size={18}
                    className="animate-spin text-editorial-red"
                  />
                </div>
              )}
              {status === "success" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-editorial-green/10">
                  <Check size={18} className="text-editorial-green" />
                </div>
              )}
              {status === "error" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-editorial-red/10">
                  <X size={18} className="text-editorial-red" />
                </div>
              )}
              <span>
                {status === "success"
                  ? "Complete"
                  : status === "error"
                    ? "Error"
                    : title}
              </span>
            </DialogTitle>
            <DialogDescription>
              {status === "running" && (
                <span>
                  {description}
                  <span className="ml-2 font-mono text-[11px] text-ink-muted">
                    {formatElapsed(elapsed)}
                  </span>
                </span>
              )}
              {status === "success" && resultMessage}
              {status === "error" && errorMessage}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div className="px-4 sm:px-5">
            <div className="h-1.5 w-full overflow-hidden bg-ink/10">
              {status === "running" ? (
                <div className="h-full w-1/3 animate-pulse bg-editorial-red [animation-duration:1.5s]">
                  <div className="h-full w-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-editorial-red via-editorial-red/60 to-editorial-red" />
                </div>
              ) : status === "success" ? (
                <div className="h-full w-full bg-editorial-green transition-all duration-500" />
              ) : (
                <div className="h-full w-full bg-editorial-red transition-all duration-500" />
              )}
            </div>
          </div>

          {/* Footer */}
          {status !== "running" && (
            <DialogFooter>
              <Button
                variant={status === "success" ? "primary" : "outline"}
                size="sm"
                onClick={handleClose}
              >
                {status === "success" ? "Done" : "Close"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </ActionProgressContext.Provider>
  );
}
