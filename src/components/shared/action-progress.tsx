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
  DialogFooter,
} from "@/components/ui/dialog";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface ActionConfig {
  title: string;
  description?: string;
  successMessage?: string;
  /** Steps shown during progress — auto-advances based on elapsed time */
  steps?: string[];
  /** Estimated total duration in seconds (default 30) */
  estimatedDuration?: number;
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
  const [steps, setSteps] = useState<string[]>([]);
  const [estimatedDuration, setEstimatedDuration] = useState(30);
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
      setTitle(config.title);
      setDescription(config.description ?? "AI is processing your data");
      setSteps(config.steps ?? []);
      setEstimatedDuration(config.estimatedDuration ?? 30);
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

  // Compute progress percentage (capped at 95% while running)
  const progressPct =
    status === "success"
      ? 100
      : status === "error"
        ? 100
        : Math.min(95, Math.round((elapsed / estimatedDuration) * 100));

  // Compute which step is active based on elapsed time
  const activeStepIndex =
    steps.length > 0
      ? Math.min(
          steps.length - 1,
          Math.floor((elapsed / estimatedDuration) * steps.length)
        )
      : 0;

  // Estimated remaining
  const remaining = Math.max(0, estimatedDuration - elapsed);

  return (
    <ActionProgressContext.Provider value={{ runAction, isRunning }}>
      {children}

      <Dialog
        open={status !== "idle"}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent hideClose={status === "running"} className="gap-0 p-0">
          {/* Header with icon */}
          <div className="flex items-start gap-3 p-5 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-rule bg-surface-cream dark:bg-ink/10">
              {status === "running" && (
                <Loader2 size={20} className="animate-spin text-editorial-red" />
              )}
              {status === "success" && (
                <Check size={20} className="text-editorial-green" />
              )}
              {status === "error" && (
                <X size={20} className="text-editorial-red" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-base font-bold text-ink">
                {status === "success"
                  ? "Complete"
                  : status === "error"
                    ? "Error"
                    : title}
              </h3>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                {status === "running" && description}
                {status === "success" && resultMessage}
                {status === "error" && errorMessage}
              </p>
            </div>
          </div>

          {/* Progress section */}
          <div className="border-t border-rule px-5 py-4">
            {/* Progress bar label + percentage */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Progress
              </span>
              <span className="font-mono text-[11px] font-medium text-ink-secondary">
                {progressPct}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden bg-ink/10">
              {status === "running" ? (
                <div
                  className="h-full bg-editorial-red transition-all duration-1000 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              ) : status === "success" ? (
                <div className="h-full w-full bg-editorial-green transition-all duration-500" />
              ) : (
                <div className="h-full w-full bg-editorial-red transition-all duration-500" />
              )}
            </div>

            {/* Steps list */}
            {steps.length > 0 && status === "running" && (
              <ul className="mt-4 flex flex-col gap-2">
                {steps.map((step, i) => {
                  const isActive = i === activeStepIndex;
                  const isComplete = i < activeStepIndex;
                  return (
                    <li key={i} className="flex items-center gap-2.5">
                      {/* Status dot */}
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          isComplete
                            ? "bg-editorial-green"
                            : isActive
                              ? "bg-editorial-red animate-pulse"
                              : "bg-ink/20"
                        }`}
                      />
                      <span
                        className={`text-[13px] ${
                          isComplete
                            ? "text-ink-muted line-through"
                            : isActive
                              ? "font-medium text-ink"
                              : "text-ink-muted"
                        }`}
                      >
                        {step}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-rule px-5 py-3">
            {status === "running" ? (
              <>
                <div className="flex gap-4">
                  <span className="font-mono text-[11px] text-ink-muted">
                    Elapsed: <span className="font-medium text-ink-secondary">{elapsed}s</span>
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    Est. remaining: <span className="font-medium text-ink-secondary">~{remaining}s</span>
                  </span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Powered by Optic Rank
                </span>
              </>
            ) : (
              <DialogFooter className="w-full">
                <Button
                  variant={status === "success" ? "primary" : "outline"}
                  size="sm"
                  onClick={handleClose}
                >
                  {status === "success" ? "Done" : "Close"}
                </Button>
              </DialogFooter>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ActionProgressContext.Provider>
  );
}
