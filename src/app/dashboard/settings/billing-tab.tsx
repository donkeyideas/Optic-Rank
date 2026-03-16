"use client";

import { useState, useTransition } from "react";
import {
  CreditCard,
  TrendingUp,
  ExternalLink,
  Crown,
  CheckCircle,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createCheckoutSession, createPortalSession } from "@/lib/actions/billing";
import type { Organization } from "@/types";
import type { PlanId } from "@/lib/stripe/client";
import type { GatedResource } from "@/lib/stripe/plan-gate";

interface BillingTabProps {
  organization: Organization;
  usage: Record<GatedResource, { current: number; limit: number }>;
  billingEvents: Array<{
    id: string;
    event_type: string;
    amount_cents: number | null;
    currency: string;
    created_at: string;
  }>;
}

const PLAN_DISPLAY: Record<string, { color: string; badge: "muted" | "info" | "default" | "success" }> = {
  free: { color: "text-ink-muted", badge: "muted" },
  starter: { color: "text-editorial-gold", badge: "info" },
  pro: { color: "text-editorial-red", badge: "default" },
  business: { color: "text-editorial-green", badge: "success" },
  enterprise: { color: "text-editorial-green", badge: "success" },
};

const UPGRADE_OPTIONS: { plan: PlanId; name: string; price: string; features: string[] }[] = [
  {
    plan: "starter",
    name: "Starter",
    price: "$29/mo",
    features: ["3 projects", "500 keywords", "5K pages/audit", "3 team members"],
  },
  {
    plan: "pro",
    name: "Pro",
    price: "$79/mo",
    features: ["10 projects", "5K keywords", "50K pages/audit", "10 team members"],
  },
  {
    plan: "business",
    name: "Business",
    price: "$199/mo",
    features: ["100 projects", "25K keywords", "500K pages/audit", "50 team members"],
  },
];

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[12px] text-ink-secondary">{label}</span>
        <span className={`font-mono text-[11px] tabular-nums ${isAtLimit ? "text-editorial-red font-bold" : isNearLimit ? "text-editorial-gold" : "text-ink-muted"}`}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full bg-rule">
        <div
          className={`h-full transition-all ${isAtLimit ? "bg-editorial-red" : isNearLimit ? "bg-editorial-gold" : "bg-editorial-green"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function BillingTab({ organization, usage, billingEvents }: BillingTabProps) {
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const planDisplay = PLAN_DISPLAY[organization.plan] ?? PLAN_DISPLAY.free;

  function handleUpgrade(planId: PlanId) {
    setStatusMsg(null);
    startTransition(async () => {
      const result = await createCheckoutSession(planId);
      if ("error" in result) {
        setStatusMsg(`Error: ${result.error}`);
      } else {
        window.location.href = result.url;
      }
    });
  }

  function handleManageSubscription() {
    setStatusMsg(null);
    startTransition(async () => {
      const result = await createPortalSession();
      if ("error" in result) {
        setStatusMsg(`Error: ${result.error}`);
      } else {
        window.location.href = result.url;
      }
    });
  }

  return (
    <div className="max-w-3xl">
      <ColumnHeader title="Billing & Subscription" subtitle="Manage your plan and view usage" />

      {statusMsg && (
        <div
          className={`mt-4 border px-4 py-2 text-sm ${
            statusMsg.startsWith("Error")
              ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red"
              : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"
          }`}
        >
          {statusMsg}
        </div>
      )}

      {/* Current Plan */}
      <div className="mt-6 border border-rule bg-surface-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown size={18} className={planDisplay.color} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-ink capitalize">{organization.plan} Plan</h3>
                <Badge variant={planDisplay.badge}>{organization.subscription_status}</Badge>
              </div>
              {organization.plan !== "free" && (
                <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
                  Stripe ID: {organization.stripe_subscription_id ?? "—"}
                </p>
              )}
            </div>
          </div>
          {organization.stripe_customer_id && (
            <Button variant="outline" size="sm" disabled={isPending} onClick={handleManageSubscription}>
              <ExternalLink size={13} />
              Manage Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Usage */}
      <div className="mt-6 border border-rule bg-surface-card p-5">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Current Usage
        </span>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <UsageBar label="Projects" current={usage.projects.current} limit={usage.projects.limit} />
          <UsageBar label="Keywords" current={usage.keywords.current} limit={usage.keywords.limit} />
          <UsageBar label="Pages Crawled (month)" current={usage.pages_crawl.current} limit={usage.pages_crawl.limit} />
          <UsageBar label="Team Members" current={usage.users.current} limit={usage.users.limit} />
        </div>
      </div>

      {/* Upgrade Options */}
      {organization.plan === "free" || organization.plan === "starter" ? (
        <div className="mt-6">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Upgrade Your Plan
          </span>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {UPGRADE_OPTIONS.filter((o) => {
              const planOrder = ["free", "starter", "pro", "business"];
              return planOrder.indexOf(o.plan) > planOrder.indexOf(organization.plan);
            }).map((option) => (
              <div key={option.plan} className="border border-rule bg-surface-card p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-sm font-bold text-ink">{option.name}</h4>
                  <span className="font-mono text-xs font-bold text-editorial-red">{option.price}</span>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {option.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
                      <CheckCircle size={10} className="shrink-0 text-editorial-green" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4 w-full justify-center"
                  disabled={isPending}
                  onClick={() => handleUpgrade(option.plan)}
                >
                  <TrendingUp size={13} />
                  Upgrade to {option.name}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Billing History */}
      {billingEvents.length > 0 && (
        <div className="mt-6">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Billing History
          </span>
          <div className="mt-3 border border-rule">
            {billingEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between border-b border-rule px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={14} className="text-ink-muted" />
                  <div>
                    <span className="font-sans text-[12px] font-medium text-ink">
                      {ev.event_type.replace(/\./g, " ").replace(/_/g, " ")}
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-ink-muted">
                      {new Date(ev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {ev.amount_cents != null && ev.amount_cents > 0 && (
                  <span className="font-mono text-sm font-bold tabular-nums text-ink">
                    ${(ev.amount_cents / 100).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
