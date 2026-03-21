"use client";

import { useState, useTransition } from "react";
import {
  CreditCard,
  TrendingUp,
  ExternalLink,
  Crown,
  CheckCircle,
  X,
  Loader2,
} from "lucide-react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createCheckoutSession, createPortalSession, activateSubscription } from "@/lib/actions/billing";
import { getStripePromise } from "@/lib/stripe/client";
import type { Organization } from "@/types";
import type { PlanId } from "@/lib/stripe/client";
import type { GatedResource } from "@/lib/stripe/plan-gate";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";

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

const UPGRADE_OPTIONS: { plan: PlanId; name: string; price: string; priceNum: number; features: string[] }[] = [
  {
    plan: "starter",
    name: "Starter",
    price: "$29/mo",
    priceNum: 29,
    features: ["3 projects", "500 keywords", "5K pages/audit", "3 team members"],
  },
  {
    plan: "pro",
    name: "Pro",
    price: "$79/mo",
    priceNum: 79,
    features: ["10 projects", "5K keywords", "50K pages/audit", "10 team members"],
  },
  {
    plan: "business",
    name: "Business",
    price: "$199/mo",
    priceNum: 199,
    features: ["100 projects", "25K keywords", "500K pages/audit", "50 team members"],
  },
];

/* ------------------------------------------------------------------
   Payment Form (inside Elements provider)
   ------------------------------------------------------------------ */

function PaymentForm({
  planName,
  price,
  onSuccess,
  onCancel,
}: {
  planName: string;
  price: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/settings?tab=billing&success=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message ?? "Payment failed. Please try again.");
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Plan summary */}
      <div className="border-b border-rule px-6 py-5">
        <p className="font-sans text-xs uppercase tracking-wider text-ink-muted">
          Subscribe to
        </p>
        <div className="mt-1 flex items-baseline justify-between">
          <h4 className="font-serif text-lg font-bold text-ink">{planName} Plan</h4>
          <div className="text-right">
            <span className="font-serif text-2xl font-bold text-ink">${price}</span>
            <span className="ml-1 font-sans text-xs text-ink-muted">/ month</span>
          </div>
        </div>
      </div>

      {/* Payment Element */}
      <div className="px-6 py-5">
        <p className="mb-4 font-sans text-xs font-bold uppercase tracking-wider text-ink-muted">
          Payment method
        </p>
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />

        {errorMsg && (
          <div className="mt-4 border border-editorial-red/30 bg-editorial-red/5 px-4 py-2 text-sm text-editorial-red">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-rule px-6 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="font-sans text-sm text-ink-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
        <div className="flex items-center gap-4">
          <span className="font-sans text-[10px] text-ink-muted">
            Powered by <strong>Stripe</strong>
          </span>
          <button
            type="submit"
            disabled={!stripe || isProcessing}
            className="inline-flex items-center gap-2 bg-editorial-red px-6 py-2.5 font-sans text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${price}/mo`
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------
   Usage Bar
   ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------
   Billing Tab
   ------------------------------------------------------------------ */

export function BillingTab({ organization, usage, billingEvents }: BillingTabProps) {
  const timezone = useTimezone();
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<{
    clientSecret: string;
    subscriptionId: string;
    planName: string;
    price: number;
  } | null>(null);
  const planDisplay = PLAN_DISPLAY[organization.plan] ?? PLAN_DISPLAY.free;

  function handleUpgrade(planId: PlanId) {
    const option = UPGRADE_OPTIONS.find((o) => o.plan === planId);
    if (!option) return;

    setStatusMsg(null);
    startTransition(async () => {
      const result = await createCheckoutSession(planId);
      if ("error" in result) {
        setStatusMsg(`Error: ${result.error}`);
      } else {
        setCheckoutData({
          clientSecret: result.clientSecret,
          subscriptionId: result.subscriptionId,
          planName: option.name,
          price: option.priceNum,
        });
      }
    });
  }

  function handleCloseCheckout() {
    setCheckoutData(null);
  }

  async function handlePaymentSuccess() {
    const subId = checkoutData?.subscriptionId;
    setCheckoutData(null);
    setStatusMsg("Payment successful! Activating your plan...");

    // Directly activate the subscription (don't rely on webhook for local dev)
    if (subId) {
      const result = await activateSubscription(subId);
      if ("error" in result) {
        console.warn("[Billing] Activation via action failed, webhook will handle:", result.error);
      }
    }

    // Reload to reflect new subscription status
    setTimeout(() => window.location.reload(), 1500);
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

  const stripePromise = getStripePromise();

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
                      {formatDate(ev.created_at, timezone)}
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

      {/* Payment Modal */}
      {checkoutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-md overflow-hidden border border-rule bg-surface-cream shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <h3 className="font-serif text-base font-bold text-ink">
                Complete Payment
              </h3>
              <button
                onClick={handleCloseCheckout}
                className="flex h-7 w-7 items-center justify-center text-ink-muted transition-colors hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stripe Elements */}
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: checkoutData.clientSecret,
                appearance: {
                  theme: "flat",
                  variables: {
                    colorPrimary: "#c0392b",
                    colorBackground: "#f5f2ed",
                    colorText: "#1a1a1a",
                    colorDanger: "#c0392b",
                    fontFamily: "IBM Plex Sans, system-ui, sans-serif",
                    fontSizeBase: "14px",
                    spacingUnit: "4px",
                    borderRadius: "0px",
                    colorTextSecondary: "#6b6b6b",
                    colorTextPlaceholder: "#999999",
                  },
                  rules: {
                    ".Input": {
                      border: "1px solid #d4d0cb",
                      boxShadow: "none",
                      padding: "10px 12px",
                    },
                    ".Input:focus": {
                      border: "1px solid #1a1a1a",
                      boxShadow: "none",
                    },
                    ".Tab": {
                      border: "1px solid #d4d0cb",
                      boxShadow: "none",
                    },
                    ".Tab--selected": {
                      border: "1px solid #1a1a1a",
                      backgroundColor: "#1a1a1a",
                      color: "#f5f2ed",
                    },
                    ".Label": {
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#6b6b6b",
                    },
                  },
                },
              }}
            >
              <PaymentForm
                planName={checkoutData.planName}
                price={checkoutData.price}
                onSuccess={handlePaymentSuccess}
                onCancel={handleCloseCheckout}
              />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
}
