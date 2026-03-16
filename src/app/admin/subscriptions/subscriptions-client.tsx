"use client";

import { useState, useTransition } from "react";
import {
  Tag,
  DollarSign,
  Users,
  FolderKanban,
  Search,
  FileText,
  Save,
  Star,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updatePricingPlan } from "@/lib/actions/subscriptions";

/* ── Types ─────────────────────────────────────────────────────── */

interface PricingPlan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  price_monthly: number;
  stripe_price_id: string | null;
  max_projects: number;
  max_keywords: number;
  max_pages_crawl: number;
  max_users: number;
  features: string | string[];
  comparison: string | Record<string, string | boolean>;
  display_order: number;
  is_highlighted: boolean;
  highlight_label: string | null;
  cta_text: string;
  cta_href: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SubscriptionsClientProps {
  plans: PricingPlan[];
}

/* ── Helpers ───────────────────────────────────────────────────── */

function parseFeatures(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function parseComparison(raw: string | Record<string, string | boolean>): Record<string, string | boolean> {
  if (typeof raw === "object" && raw !== null) return raw as Record<string, string | boolean>;
  try { return JSON.parse(raw as string); } catch { return {}; }
}

/* ── Component ─────────────────────────────────────────────────── */

export function SubscriptionsClient({ plans }: SubscriptionsClientProps) {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Per-plan edit states
  const [edits, setEdits] = useState<Record<string, Partial<PricingPlan>>>({});

  function getEditValue<K extends keyof PricingPlan>(planKey: string, field: K, original: PricingPlan[K]) {
    return (edits[planKey]?.[field] ?? original) as PricingPlan[K];
  }

  function setEditValue(planKey: string, field: keyof PricingPlan, value: unknown) {
    setEdits((prev) => ({
      ...prev,
      [planKey]: { ...prev[planKey], [field]: value },
    }));
  }

  function handleSave(plan: PricingPlan) {
    const changes = edits[plan.plan_key];
    if (!changes) return;

    const data: Record<string, unknown> = {};
    if (changes.name !== undefined) data.name = changes.name;
    if (changes.description !== undefined) data.description = changes.description;
    if (changes.price_monthly !== undefined) data.price_monthly = Number(changes.price_monthly);
    if (changes.stripe_price_id !== undefined) data.stripe_price_id = changes.stripe_price_id;
    if (changes.max_projects !== undefined) data.max_projects = Number(changes.max_projects);
    if (changes.max_keywords !== undefined) data.max_keywords = Number(changes.max_keywords);
    if (changes.max_pages_crawl !== undefined) data.max_pages_crawl = Number(changes.max_pages_crawl);
    if (changes.max_users !== undefined) data.max_users = Number(changes.max_users);
    if (changes.features !== undefined) data.features = typeof changes.features === "string" ? JSON.parse(changes.features) : changes.features;
    if (changes.comparison !== undefined) data.comparison = typeof changes.comparison === "string" ? JSON.parse(changes.comparison) : changes.comparison;
    if (changes.is_highlighted !== undefined) data.is_highlighted = changes.is_highlighted;
    if (changes.highlight_label !== undefined) data.highlight_label = changes.highlight_label;
    if (changes.cta_text !== undefined) data.cta_text = changes.cta_text;
    if (changes.cta_href !== undefined) data.cta_href = changes.cta_href;
    if (changes.is_active !== undefined) data.is_active = changes.is_active;

    startTransition(async () => {
      const result = await updatePricingPlan(plan.plan_key, data as Parameters<typeof updatePricingPlan>[1]);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `${plan.name} plan updated successfully.` });
        setEdits((prev) => {
          const next = { ...prev };
          delete next[plan.plan_key];
          return next;
        });
      }
      setTimeout(() => setMessage(null), 4000);
    });
  }

  // Stats
  const activePlans = plans.filter((p) => p.is_active).length;
  const highlightedPlan = plans.find((p) => p.is_highlighted);
  const totalPlans = plans.length;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">Subscription Plans</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Manage pricing tiers, features, and limits. Changes auto-update the public pricing page.
        </p>
      </div>

      {/* ── Toast ── */}
      {message && (
        <div
          className={`border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"
              : "border-editorial-red/30 bg-editorial-red/5 text-editorial-red"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Tag size={18} strokeWidth={1.5} className="text-editorial-red" />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold tracking-tight text-ink">{totalPlans}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Total Plans</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Star size={18} strokeWidth={1.5} className="text-editorial-gold" />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold tracking-tight text-ink">{activePlans}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Active Plans</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <DollarSign size={18} strokeWidth={1.5} className="text-editorial-green" />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold tracking-tight text-ink">
                {highlightedPlan?.name ?? "None"}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Highlighted Plan</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Plan Cards ── */}
      <div className="space-y-4">
        {plans.map((plan) => {
          const isExpanded = expandedPlan === plan.plan_key;
          const features = parseFeatures(plan.features);
          const comparison = parseComparison(plan.comparison);
          const hasChanges = !!edits[plan.plan_key];

          return (
            <Card key={plan.id} className={plan.is_highlighted ? "border-editorial-red" : ""}>
              {/* ── Plan Summary Row ── */}
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedPlan(isExpanded ? null : plan.plan_key)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle className="font-serif text-lg">{plan.name}</CardTitle>
                    <span className="font-mono text-lg font-bold text-ink">
                      {plan.price_monthly === 0 ? "Free" : `$${plan.price_monthly}/mo`}
                    </span>
                    {plan.is_highlighted && <Badge variant="danger">{plan.highlight_label || "Featured"}</Badge>}
                    {!plan.is_active && <Badge variant="muted">Inactive</Badge>}
                    {hasChanges && <Badge variant="info">Unsaved</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden items-center gap-4 text-xs text-ink-muted sm:flex">
                      <span className="flex items-center gap-1"><FolderKanban size={12} /> {plan.max_projects} projects</span>
                      <span className="flex items-center gap-1"><Search size={12} /> {plan.max_keywords.toLocaleString()} keywords</span>
                      <span className="flex items-center gap-1"><FileText size={12} /> {plan.max_pages_crawl.toLocaleString()} pages</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {plan.max_users} users</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </CardHeader>

              {/* ── Expanded Edit Form ── */}
              {isExpanded && (
                <CardContent className="space-y-6 border-t border-rule pt-6">
                  {/* Row 1: Basic Info */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Plan Name</label>
                      <input
                        type="text"
                        className="h-9 w-full border border-rule bg-surface-cream px-3 text-sm text-ink outline-none focus:border-ink"
                        value={getEditValue(plan.plan_key, "name", plan.name)}
                        onChange={(e) => setEditValue(plan.plan_key, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Price ($/mo)</label>
                      <input
                        type="number"
                        className="h-9 w-full border border-rule bg-surface-cream px-3 font-mono text-sm text-ink outline-none focus:border-ink"
                        value={getEditValue(plan.plan_key, "price_monthly", plan.price_monthly)}
                        onChange={(e) => setEditValue(plan.plan_key, "price_monthly", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Stripe Price ID</label>
                      <input
                        type="text"
                        className="h-9 w-full border border-rule bg-surface-cream px-3 font-mono text-sm text-ink outline-none focus:border-ink"
                        value={getEditValue(plan.plan_key, "stripe_price_id", plan.stripe_price_id ?? "") as string}
                        onChange={(e) => setEditValue(plan.plan_key, "stripe_price_id", e.target.value)}
                        placeholder="price_..."
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Description</label>
                    <textarea
                      className="h-20 w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                      value={getEditValue(plan.plan_key, "description", plan.description ?? "") as string}
                      onChange={(e) => setEditValue(plan.plan_key, "description", e.target.value)}
                    />
                  </div>

                  {/* Row 2: Limits */}
                  <div>
                    <h4 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Plan Limits</h4>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs text-ink-secondary">Max Projects</label>
                        <input
                          type="number"
                          className="h-9 w-full border border-rule bg-surface-cream px-3 font-mono text-sm text-ink outline-none focus:border-ink"
                          value={getEditValue(plan.plan_key, "max_projects", plan.max_projects)}
                          onChange={(e) => setEditValue(plan.plan_key, "max_projects", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-ink-secondary">Max Keywords</label>
                        <input
                          type="number"
                          className="h-9 w-full border border-rule bg-surface-cream px-3 font-mono text-sm text-ink outline-none focus:border-ink"
                          value={getEditValue(plan.plan_key, "max_keywords", plan.max_keywords)}
                          onChange={(e) => setEditValue(plan.plan_key, "max_keywords", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-ink-secondary">Max Pages Crawl</label>
                        <input
                          type="number"
                          className="h-9 w-full border border-rule bg-surface-cream px-3 font-mono text-sm text-ink outline-none focus:border-ink"
                          value={getEditValue(plan.plan_key, "max_pages_crawl", plan.max_pages_crawl)}
                          onChange={(e) => setEditValue(plan.plan_key, "max_pages_crawl", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-ink-secondary">Max Users</label>
                        <input
                          type="number"
                          className="h-9 w-full border border-rule bg-surface-cream px-3 font-mono text-sm text-ink outline-none focus:border-ink"
                          value={getEditValue(plan.plan_key, "max_users", plan.max_users)}
                          onChange={(e) => setEditValue(plan.plan_key, "max_users", Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Features List */}
                  <div>
                    <h4 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Features (shown on pricing card)</h4>
                    <FeatureListEditor
                      features={parseFeatures(getEditValue(plan.plan_key, "features", plan.features))}
                      onChange={(updated) => setEditValue(plan.plan_key, "features", updated)}
                    />
                  </div>

                  {/* Row 4: Comparison Data (JSON editor) */}
                  <div>
                    <h4 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Comparison Data (JSON)</h4>
                    <textarea
                      className="h-32 w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-xs text-ink outline-none focus:border-ink"
                      value={JSON.stringify(
                        parseComparison(getEditValue(plan.plan_key, "comparison", plan.comparison)),
                        null,
                        2
                      )}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEditValue(plan.plan_key, "comparison", parsed);
                        } catch {
                          // Allow typing invalid JSON temporarily
                          setEditValue(plan.plan_key, "comparison", e.target.value);
                        }
                      }}
                    />
                  </div>

                  {/* Row 5: Display settings */}
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">CTA Text</label>
                      <input
                        type="text"
                        className="h-9 w-full border border-rule bg-surface-cream px-3 text-sm text-ink outline-none focus:border-ink"
                        value={getEditValue(plan.plan_key, "cta_text", plan.cta_text)}
                        onChange={(e) => setEditValue(plan.plan_key, "cta_text", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">CTA Link</label>
                      <input
                        type="text"
                        className="h-9 w-full border border-rule bg-surface-cream px-3 text-sm text-ink outline-none focus:border-ink"
                        value={getEditValue(plan.plan_key, "cta_href", plan.cta_href)}
                        onChange={(e) => setEditValue(plan.plan_key, "cta_href", e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-4">
                      <label className="flex items-center gap-2 text-sm text-ink-secondary">
                        <input
                          type="checkbox"
                          checked={getEditValue(plan.plan_key, "is_highlighted", plan.is_highlighted) as boolean}
                          onChange={(e) => setEditValue(plan.plan_key, "is_highlighted", e.target.checked)}
                          className="accent-editorial-red"
                        />
                        Highlighted
                      </label>
                      <label className="flex items-center gap-2 text-sm text-ink-secondary">
                        <input
                          type="checkbox"
                          checked={getEditValue(plan.plan_key, "is_active", plan.is_active) as boolean}
                          onChange={(e) => setEditValue(plan.plan_key, "is_active", e.target.checked)}
                          className="accent-editorial-green"
                        />
                        Active
                      </label>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Highlight Label</label>
                      <input
                        type="text"
                        className="h-9 w-full border border-rule bg-surface-cream px-3 text-sm text-ink outline-none focus:border-ink"
                        value={getEditValue(plan.plan_key, "highlight_label", plan.highlight_label ?? "") as string}
                        onChange={(e) => setEditValue(plan.plan_key, "highlight_label", e.target.value)}
                        placeholder="Most Popular"
                      />
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex items-center justify-between border-t border-rule pt-4">
                    <p className="text-xs text-ink-muted">
                      Last updated: {new Date(plan.updated_at).toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleSave(plan)}
                      disabled={saving || !hasChanges}
                      className="inline-flex h-9 items-center gap-2 bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-40"
                    >
                      <Save size={14} />
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ── Feature List Editor ────────────────────────────────────────── */

function FeatureListEditor({
  features,
  onChange,
}: {
  features: string[];
  onChange: (updated: string[]) => void;
}) {
  const [newFeature, setNewFeature] = useState("");

  function addFeature() {
    if (!newFeature.trim()) return;
    onChange([...features, newFeature.trim()]);
    setNewFeature("");
  }

  function removeFeature(index: number) {
    onChange(features.filter((_, i) => i !== index));
  }

  function updateFeature(index: number, value: string) {
    const updated = [...features];
    updated[index] = value;
    onChange(updated);
  }

  return (
    <div className="space-y-2">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            className="h-8 flex-1 border border-rule bg-surface-cream px-3 text-sm text-ink outline-none focus:border-ink"
            value={feature}
            onChange={(e) => updateFeature(index, e.target.value)}
          />
          <button
            onClick={() => removeFeature(index)}
            className="flex h-8 w-8 items-center justify-center border border-rule text-ink-muted transition-colors hover:border-editorial-red hover:text-editorial-red"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="h-8 flex-1 border border-dashed border-rule bg-surface-cream px-3 text-sm text-ink outline-none focus:border-ink"
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFeature()}
          placeholder="Add a feature..."
        />
        <button
          onClick={addFeature}
          className="flex h-8 w-8 items-center justify-center border border-rule text-ink-muted transition-colors hover:border-editorial-green hover:text-editorial-green"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
