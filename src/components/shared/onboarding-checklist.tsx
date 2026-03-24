"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { completeOnboarding } from "@/lib/actions/settings";

interface OnboardingStep {
  label: string;
  description: string;
  done: boolean;
  href: string;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  userName: string | null;
}

export function OnboardingChecklist({ steps, userName }: OnboardingChecklistProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [completing, startTransition] = useTransition();
  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-complete onboarding when all steps are done
  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => {
        startTransition(async () => {
          await completeOnboarding();
          router.refresh();
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [allDone, router]);

  // Find the first incomplete step (the "active" one)
  const activeIndex = steps.findIndex((s) => !s.done);

  return (
    <div className="mx-auto max-w-2xl py-12">
      {/* Header */}
      <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
        <h1 className="font-serif text-3xl font-bold text-ink">
          {allDone
            ? "You're All Set!"
            : userName
              ? `Welcome, ${userName.split(" ")[0]}`
              : "Welcome to Optic Rank"}
        </h1>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">
          {allDone
            ? "Your intelligence dashboard is ready. Redirecting..."
            : "Complete these steps to activate your SEO intelligence dashboard."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-8 px-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          <span>Setup Progress</span>
          <span className="font-mono">{completedCount} of {steps.length}</span>
        </div>
        <div className="mt-2 h-1.5 w-full bg-rule">
          <div
            className="h-full bg-editorial-green transition-all duration-700 ease-out"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step cards */}
      <div className="mt-8 flex flex-col gap-3">
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          const isPast = step.done;
          const isFuture = !step.done && !isActive;

          return (
            <div
              key={i}
              className={`flex items-start gap-4 border p-5 transition-all duration-500 ${
                isPast
                  ? "border-editorial-green/30 bg-editorial-green/5"
                  : isActive
                    ? "border-rule-dark bg-surface-card shadow-sm"
                    : "border-rule bg-surface-raised opacity-50"
              }`}
              style={{
                opacity: mounted ? (isFuture ? 0.5 : 1) : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
              }}
            >
              {/* Number / Check circle */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 font-serif text-lg font-bold transition-colors duration-300 ${
                  isPast
                    ? "border-editorial-green bg-editorial-green text-white"
                    : isActive
                      ? "border-ink text-ink"
                      : "border-rule text-ink-muted"
                }`}
              >
                {isPast ? <Check size={18} strokeWidth={3} /> : i + 1}
              </div>

              {/* Text */}
              <div className="flex-1">
                <h3
                  className={`font-serif text-base font-bold ${
                    isPast ? "text-editorial-green" : isActive ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {step.label}
                </h3>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-secondary">
                  {step.description}
                </p>
              </div>

              {/* CTA */}
              <div className="shrink-0 self-center">
                {isPast ? (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-editorial-green">
                    Done
                  </span>
                ) : isActive ? (
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-1.5 bg-ink px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90"
                  >
                    Start
                    <ArrowRight size={12} />
                  </Link>
                ) : (
                  <span className="font-mono text-[10px] text-ink-muted">Locked</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* All done celebration */}
      {allDone && (
        <div
          className="mt-8 flex flex-col items-center gap-4 border-t-2 border-b-2 border-editorial-green/30 py-6 text-center"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.6s ease 0.3s",
          }}
        >
          <Sparkles size={28} className="text-editorial-green" />
          <p className="font-serif text-lg font-bold text-ink">
            Your dashboard is ready!
          </p>
          <p className="text-[12px] text-ink-secondary">
            {completing ? "Redirecting to your dashboard..." : "Loading your intelligence report..."}
          </p>
        </div>
      )}
    </div>
  );
}
