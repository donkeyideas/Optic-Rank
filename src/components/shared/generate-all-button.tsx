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
  type StepResult,
} from "@/lib/actions/generate-all-steps";

interface GenerateAllButtonProps {
  projectId: string;
}

type StepState = {
  key: string;
  name: string;
  status: "pending" | "running" | "done" | "error";
  message?: string;
};

export function GenerateAllButton({ projectId }: GenerateAllButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [finished, setFinished] = useState(false);

  const handleRun = useCallback(async () => {
    // Initialize steps
    const initial: StepState[] = GENERATE_ALL_STEPS.map((s) => ({
      key: s.key,
      name: s.name,
      status: "pending" as const,
    }));
    setSteps(initial);
    setIsRunning(true);
    setShowModal(true);
    setFinished(false);

    // Run each step sequentially, updating UI after each
    for (let i = 0; i < GENERATE_ALL_STEPS.length; i++) {
      const step = GENERATE_ALL_STEPS[i];

      // Mark current step as running
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: "running" as const } : s
        )
      );

      // Execute the step
      const result: StepResult = await runGenerateStep(projectId, step.key);

      // Update with result
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i
            ? { ...s, status: result.status, message: result.message }
            : s
        )
      );
    }

    // Revalidate all paths
    await revalidateAllDashboard();

    setIsRunning(false);
    setFinished(true);
  }, [projectId]);

  const completedCount = steps.filter((s) => s.status === "done").length;
  const errorCount = steps.filter((s) => s.status === "error").length;
  const currentStep = steps.find((s) => s.status === "running");

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
              ) : currentStep ? (
                <span>
                  Processing: {currentStep.name} ({completedCount + errorCount + 1} of{" "}
                  {steps.length})
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

          {/* Steps list */}
          <div className="max-h-[400px] overflow-y-auto px-4 pb-2 sm:px-5">
            <div className="flex flex-col">
              {steps.map((step, i) => (
                <div
                  key={step.key}
                  className="flex items-center gap-3 border-b border-rule py-2.5 last:border-0"
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
