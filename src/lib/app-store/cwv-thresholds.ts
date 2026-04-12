// ────────────────────────────────────────────────────────────
// Core Web Vitals thresholds & helpers
// Based on Google's official CWV guidelines.
// ────────────────────────────────────────────────────────────

export interface CwvThreshold {
  label: string;
  unit: string;
  good: number;
  needsWork: number;
  /** Divide raw value by this to get display value (e.g., ms→s) */
  displayDivisor: number;
  displayUnit: string;
}

export const CWV_THRESHOLDS: Record<string, CwvThreshold> = {
  lcp_ms:              { label: "LCP",         unit: "ms", good: 2500,  needsWork: 4000,  displayDivisor: 1000, displayUnit: "s"  },
  fcp_ms:              { label: "FCP",         unit: "ms", good: 1800,  needsWork: 3000,  displayDivisor: 1000, displayUnit: "s"  },
  cls:                 { label: "CLS",         unit: "",   good: 0.1,   needsWork: 0.25,  displayDivisor: 1,    displayUnit: ""   },
  inp_ms:              { label: "INP",         unit: "ms", good: 200,   needsWork: 500,   displayDivisor: 1,    displayUnit: "ms" },
  ttfb_ms:             { label: "TTFB",        unit: "ms", good: 800,   needsWork: 1800,  displayDivisor: 1,    displayUnit: "ms" },
  speed_index:         { label: "Speed Index", unit: "ms", good: 3400,  needsWork: 5800,  displayDivisor: 1000, displayUnit: "s"  },
  total_blocking_time: { label: "TBT",         unit: "ms", good: 200,   needsWork: 600,   displayDivisor: 1,    displayUnit: "ms" },
};

export type CwvRating = "good" | "needs-work" | "poor";

export function getCwvRating(key: string, value: number): CwvRating {
  const t = CWV_THRESHOLDS[key];
  if (!t) return "needs-work";
  if (value <= t.good) return "good";
  if (value <= t.needsWork) return "needs-work";
  return "poor";
}

export function getScoreRating(score: number): CwvRating {
  if (score >= 90) return "good";
  if (score >= 50) return "needs-work";
  return "poor";
}

export function getCwvColor(rating: CwvRating): string {
  switch (rating) {
    case "good":       return "text-editorial-green";
    case "needs-work": return "text-editorial-gold";
    case "poor":       return "text-editorial-red";
  }
}

export function getCwvBgColor(rating: CwvRating): string {
  switch (rating) {
    case "good":       return "bg-editorial-green";
    case "needs-work": return "bg-editorial-gold";
    case "poor":       return "bg-editorial-red";
  }
}

export function formatCwvValue(key: string, value: number): string {
  const t = CWV_THRESHOLDS[key];
  if (!t) return String(Math.round(value));
  const display = value / t.displayDivisor;
  if (t.displayUnit === "s") return `${display.toFixed(1)}${t.displayUnit}`;
  if (key === "cls") return display.toFixed(2);
  return `${Math.round(display)}${t.displayUnit}`;
}

/** Android Vitals thresholds (percentage) */
export const VITALS_THRESHOLDS = {
  crash_rate: { good: 0.5, bad: 2.0 },
  anr_rate:   { good: 0.1, bad: 0.5 },
} as const;

export function getVitalsRating(key: "crash_rate" | "anr_rate", value: number): CwvRating {
  const t = VITALS_THRESHOLDS[key];
  if (value <= t.good) return "good";
  if (value <= t.bad) return "needs-work";
  return "poor";
}
