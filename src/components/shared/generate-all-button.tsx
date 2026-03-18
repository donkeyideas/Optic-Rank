"use client";

import { useState, useCallback } from "react";
import { Check, X, Loader2, Zap, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  runGenerateStep,
  revalidateAllDashboard,
} from "@/lib/actions/generate-all";
import {
  GENERATE_ALL_STEPS,
  MAX_PHASE,
  getPhaseSteps,
  PHASE_LABELS,
  type StepResult,
} from "@/lib/actions/generate-all-steps";

interface GenerateAllButtonProps {
  projectId: string;
}

type StepState = {
  key: string;
  name: string;
  phase: number;
  status: "pending" | "running" | "done" | "error";
  message?: string;
};

/** Run a step with a timeout (default 90s per step) */
async function runWithTimeout(
  projectId: string,
  stepKey: string,
  timeoutMs: number = 90_000
): Promise<StepResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      runGenerateStep(projectId, stepKey),
      new Promise<StepResult>((_, reject) =>
        controller.signal.addEventListener("abort", () =>
          reject(new Error("Step timed out"))
        )
      ),
    ]);
    return result;
  } catch {
    return { status: "error", message: "Timed out (90s limit)" };
  } finally {
    clearTimeout(timer);
  }
}

export function GenerateAllButton({ projectId }: GenerateAllButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [finished, setFinished] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);

  const handleRun = useCallback(async () => {
    // Initialize steps
    const initial: StepState[] = GENERATE_ALL_STEPS.map((s) => ({
      key: s.key,
      name: s.name,
      phase: s.phase,
      status: "pending" as const,
    }));
    setSteps(initial);
    setIsRunning(true);
    setShowModal(true);
    setFinished(false);

    // Run phase by phase — steps WITHIN each phase run in parallel
    for (let phase = 1; phase <= MAX_PHASE; phase++) {
      setCurrentPhase(phase);
      const phaseSteps = getPhaseSteps(phase);

      // Mark all steps in this phase as running
      setSteps((prev) =>
        prev.map((s) =>
          s.phase === phase ? { ...s, status: "running" as const } : s
        )
      );

      // Run all steps in this phase concurrently
      const results = await Promise.allSettled(
        phaseSteps.map(async (step) => {
          const result = await runWithTimeout(projectId, step.key);
          // Update this specific step immediately when it finishes
          setSteps((prev) =>
            prev.map((s) =>
              s.key === step.key
                ? { ...s, status: result.status, message: result.message }
                : s
            )
          );
          return result;
        })
      );

      // Check if all steps in the phase failed — if so, still continue
      const allFailed = results.every(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.status === "error")
      );
      if (allFailed && phase < MAX_PHASE) {
        // Mark remaining steps in failed phases but continue
        console.warn(`[Sync] Phase ${phase} had all errors, continuing...`);
      }
    }

    // Revalidate all paths
    await revalidateAllDashboard();

    setIsRunning(false);
    setFinished(true);
    setCurrentPhase(0);
  }, [projectId]);

  const completedCount = steps.filter((s) => s.status === "done").length;
  const errorCount = steps.filter((s) => s.status === "error").length;
  const runningCount = steps.filter((s) => s.status === "running").length;

  return (
    <>
      <button
        onClick={handleRun}
        disabled={isRunning}
        className="flex items-center gap-1.5 rounded-sm bg-editorial-red px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
      >
        {isRunning ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Zap size={12} />
        )}
        {isRunning ? "Syncing..." : "Sync All"}
      </button>

      {/* Live Progress Modal */}
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!isRunning) setShowModal(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {finished ? "Sync Complete" : "Syncing All Data..."}
            </DialogTitle>
            <DialogDescription>
              {finished ? (
                <span>
                  {completedCount} of {steps.length} tasks completed
                  {errorCount > 0 && ` · ${errorCount} errors`}
                </span>
              ) : currentPhase > 0 ? (
                <span>
                  Phase {currentPhase}/5: {PHASE_LABELS[currentPhase]} ({runningCount} running, {completedCount} done)
                </span>
              ) : (
                <span>Starting...</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div className="px-4 sm:px-5">
            <div className="h-1.5 w-full overflow-hidden bg-ink/10">
              <div
                className="h-full bg-editorial-red transition-all duration-500 ease-out"
                style={{
                  width: `${((completedCount + errorCount) / Math.max(steps.length, 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Steps list grouped by phase */}
          <div className="max-h-[400px] overflow-y-auto px-4 pb-2 sm:px-5">
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map((phase) => {
                const phaseSteps = steps.filter((s) => s.phase === phase);
                if (phaseSteps.length === 0) return null;
                return (
                  <div key={phase}>
                    <div className="mt-3 mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      {PHASE_LABELS[phase]}
                      {currentPhase === phase && " — Running in parallel"}
                    </div>
                    {phaseSteps.map((step) => (
                      <div
                        key={step.key}
                        className="flex items-center gap-3 border-b border-rule py-2 last:border-0"
                      >
                        {/* Status icon */}
                        <div className="shrink-0">
                          {step.status === "running" ? (
                            <div className="flex h-5 w-5 items-center justify-center">
                              <Loader2
                                size={14}
                                className="animate-spin text-editorial-red"
                              />
                            </div>
                          ) : step.status === "done" ? (
                            <div className="flex h-5 w-5 items-center justify-center bg-editorial-green/10">
                              <Check size={12} className="text-editorial-green" />
                            </div>
                          ) : step.status === "error" ? (
                            <div className="flex h-5 w-5 items-center justify-center bg-editorial-red/10">
                              <X size={12} className="text-editorial-red" />
                            </div>
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center">
                              <Circle size={8} className="text-ink-muted/40" />
                            </div>
                          )}
                        </div>

                        {/* Step info */}
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-[12px] font-semibold ${
                              step.status === "running"
                                ? "text-editorial-red"
                                : step.status === "pending"
                                  ? "text-ink-muted"
                                  : "text-ink"
                            }`}
                          >
                            {step.name}
                          </span>
                          {step.message && (
                            <span
                              className={`ml-2 text-[11px] ${
                                step.status === "error"
                                  ? "text-editorial-red"
                                  : "text-ink-muted"
                              }`}
                            >
                              {step.message}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {finished && (
            <DialogFooter>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowModal(false);
                  window.location.reload();
                }}
              >
                Done — Refresh Dashboard
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
