"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbulb, ArrowRight, Brain, Eye, Users, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const NEXT_STEPS = [
  {
    icon: Brain,
    title: "Generate Your First Intelligence Brief",
    description: "Get a comprehensive analysis of your entire SEO position.",
    href: "/dashboard/advanced-ai",
  },
  {
    icon: Eye,
    title: "Check Your LLM Visibility",
    description: "See if ChatGPT, Gemini, and other assistants mention your brand.",
    href: "/dashboard/advanced-ai",
  },
  {
    icon: Users,
    title: "Add Competitors",
    description: "Track competitor rankings, authority scores, and content strategies.",
    href: "/dashboard/competitors",
  },
  {
    icon: TrendingUp,
    title: "View Rank Predictions",
    description: "See where your keywords are predicted to move in the next 7 days.",
    href: "/dashboard/advanced-ai",
  },
];

export function WhatsNextToolbarAction() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 rounded-none border border-editorial-gold/40 bg-editorial-gold/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-editorial-gold transition-colors hover:bg-editorial-gold/20 hover:border-editorial-gold/60"
      >
        <Lightbulb size={12} strokeWidth={2} className="text-editorial-gold" />
        <span className="hidden sm:inline">What&apos;s Next</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>What&apos;s Next?</DialogTitle>
            <DialogDescription>
              Here are the most impactful things to do next.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 p-4 sm:p-5">
            {NEXT_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.title}
                  href={step.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 border border-rule bg-surface-card p-4 transition-colors hover:bg-surface-raised group"
                >
                  <Icon size={16} className="mt-0.5 shrink-0 text-editorial-red" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-sans text-[13px] font-semibold text-ink group-hover:text-editorial-red transition-colors">
                      {step.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {step.description}
                    </p>
                  </div>
                  <ArrowRight size={14} className="mt-0.5 shrink-0 text-ink-muted group-hover:text-editorial-red transition-colors" />
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
