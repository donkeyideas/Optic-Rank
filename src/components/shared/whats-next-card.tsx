"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, ArrowRight, Brain, Eye, Users, TrendingUp } from "lucide-react";
import { dismissWhatsNext } from "@/lib/actions/settings";

const NEXT_STEPS = [
  {
    icon: Brain,
    title: "Generate Your First Intelligence Brief",
    description:
      "Get a comprehensive analysis of your entire SEO position.",
    href: "/dashboard/advanced-ai",
    cta: "Generate Brief",
  },
  {
    icon: Eye,
    title: "Check Your LLM Visibility",
    description:
      "See if ChatGPT, Gemini, and other assistants mention your brand.",
    href: "/dashboard/advanced-ai",
    cta: "Run Check",
  },
  {
    icon: Users,
    title: "Add Competitors",
    description:
      "Track competitor rankings, authority scores, and content strategies.",
    href: "/dashboard/competitors",
    cta: "Add Competitors",
  },
  {
    icon: TrendingUp,
    title: "View Rank Predictions",
    description:
      "See where your keywords are predicted to move in the next 7 days.",
    href: "/dashboard/advanced-ai",
    cta: "View Predictions",
  },
];

export function WhatsNextCard() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    startTransition(async () => {
      await dismissWhatsNext();
      router.refresh();
    });
  }

  return (
    <div className="relative border-2 border-editorial-green/30 bg-editorial-green/5 p-6 mb-6">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={isPending}
        className="absolute right-4 top-4 text-ink-muted hover:text-ink transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>

      <h2 className="font-serif text-lg font-bold text-ink mb-1">
        Your Dashboard Is Ready — What's Next?
      </h2>
      <p className="text-sm text-ink-secondary mb-5">
        You've completed the basics. Here are the most impactful things to do
        next:
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {NEXT_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.title}
              href={step.href}
              className="flex items-start gap-3 border border-rule bg-surface-card p-4 transition-colors hover:bg-surface-raised group"
            >
              <Icon
                size={16}
                className="mt-0.5 shrink-0 text-editorial-red"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-sans text-[13px] font-semibold text-ink group-hover:text-editorial-red transition-colors">
                  {step.title}
                </h3>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {step.description}
                </p>
              </div>
              <ArrowRight
                size={14}
                className="mt-0.5 shrink-0 text-ink-muted group-hover:text-editorial-red transition-colors"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
