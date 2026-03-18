"use client";

import { useState, useTransition } from "react";
import {
  FileText,
  Save,
  Globe,
  Search,
  Brain,
  Share2,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateSiteContent } from "@/lib/actions/site-content";

/* ── Types ─────────────────────────────────────────────────────── */

interface SiteContentRow {
  id: string;
  page: string;
  section: string;
  content: Record<string, unknown> | unknown[];
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
}

interface ContentClientProps {
  content: SiteContentRow[];
}

/* ── Page Config ───────────────────────────────────────────────── */

const PAGE_TABS = [
  { key: "homepage", label: "Homepage", icon: Globe },
  { key: "features", label: "Features", icon: Search },
  { key: "search-ai", label: "Search & AI", icon: Brain },
  { key: "social-intelligence", label: "Social Intel", icon: Share2 },
] as const;

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Section",
  stats: "Stats Bar",
  features_header: "Features Header",
  features: "Features Grid",
  how_it_works_header: "How It Works Header",
  how_it_works: "How It Works Steps",
  cta: "Call to Action",
  meta: "SEO Meta Tags",
  sections: "Feature Sections",
  pillars: "Pillars Overview",
  seo: "SEO Section",
  aeo: "AEO Section",
  geo: "GEO Section",
  cro: "CRO Section",
  unified: "Unified Section",
  platforms: "Platform Strip",
  audience_analytics: "Audience Analytics",
  earnings_forecast_section: "AI Earnings Forecast",
  content_engine: "Content Strategy Engine",
  competitor_bench: "Competitor Benchmarking",
  growth_intel: "Growth Intelligence",
};

/* ── Friendly field labels ─────────────────────────────────────── */

const FIELD_LABELS: Record<string, string> = {
  dateline: "Dateline",
  dateline_sub: "Dateline Subtitle",
  headline: "Headline",
  headline_highlight: "Headline Highlight",
  subheadline: "Subheadline",
  cta_primary: "Primary Button",
  cta_secondary: "Secondary Button",
  title: "Title",
  subtitle: "Subtitle",
  description: "Description",
  label: "Label",
  icon: "Icon Name",
  href: "Link URL",
  text: "Button Text",
  name: "Name",
  value: "Value",
  badge: "Badge",
  eyebrow: "Eyebrow Text",
  heading: "Heading",
  body: "Body Text",
  features: "Features List",
  items: "Items",
  stats: "Statistics",
  bullets: "Bullet Points",
  image: "Image URL",
  alt: "Image Alt Text",
};

function friendlyLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Component ─────────────────────────────────────────────────── */

export function ContentClient({ content }: ContentClientProps) {
  const [activeTab, setActiveTab] = useState<string>("homepage");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [edits, setEdits] = useState<
    Record<string, Record<string, unknown> | unknown[]>
  >({});

  const pageSections = content.filter((c) => c.page === activeTab);

  function getCurrentContent(row: SiteContentRow) {
    return edits[row.id] ?? row.content;
  }

  function updateContent(
    rowId: string,
    updated: Record<string, unknown> | unknown[]
  ) {
    setEdits((prev) => ({ ...prev, [rowId]: updated }));
  }

  function handleSave(row: SiteContentRow) {
    const edited = edits[row.id];
    if (!edited) return;

    startTransition(async () => {
      const result = await updateSiteContent(
        row.page,
        row.section,
        JSON.stringify(edited)
      );
      if ("error" in result) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({
          type: "success",
          text: `"${SECTION_LABELS[row.section] ?? row.section}" saved successfully.`,
        });
        setEdits((prev) => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
      }
      setTimeout(() => setMessage(null), 4000);
    });
  }

  const totalSections = content.length;
  const pageCount = new Set(content.map((c) => c.page)).size;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">
          Content Manager
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Edit marketing page content. Changes auto-update the public website.
        </p>
      </div>

      {/* Toast */}
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Globe
                size={18}
                strokeWidth={1.5}
                className="text-editorial-red"
              />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold tracking-tight text-ink">
                {pageCount}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Pages
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <FileText
                size={18}
                strokeWidth={1.5}
                className="text-editorial-gold"
              />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold tracking-tight text-ink">
                {totalSections}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Sections
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Clock
                size={18}
                strokeWidth={1.5}
                className="text-editorial-green"
              />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold tracking-tight text-ink">
                {pageSections.length}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Active Tab Sections
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-rule">
        {PAGE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setExpandedSection(null);
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-editorial-red text-ink"
                  : "border-transparent text-ink-muted hover:text-ink-secondary"
              }`}
            >
              <Icon size={14} strokeWidth={1.5} />
              {tab.label}
              <span className="font-mono text-xs text-ink-muted">
                ({content.filter((c) => c.page === tab.key).length})
              </span>
            </button>
          );
        })}
      </div>

      {/* Section Editors */}
      <div className="space-y-3">
        {pageSections.map((row) => {
          const isExpanded = expandedSection === row.id;
          const hasEdit = !!edits[row.id];
          const current = getCurrentContent(row);

          return (
            <Card key={row.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() =>
                  setExpandedSection(isExpanded ? null : row.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="font-serif text-base">
                      {SECTION_LABELS[row.section] ?? row.section}
                    </CardTitle>
                    {hasEdit && <Badge variant="info">Unsaved</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted">
                      {new Date(row.updated_at).toLocaleDateString()}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 border-t border-rule pt-4">
                  <VisualEditor
                    content={current}
                    onChange={(updated) => updateContent(row.id, updated)}
                  />

                  {/* Save */}
                  <div className="flex items-center justify-between border-t border-rule pt-4">
                    <p className="text-xs text-ink-muted">
                      Updated:{" "}
                      {new Date(row.updated_at).toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleSave(row)}
                      disabled={saving || !hasEdit}
                      className="inline-flex h-9 items-center gap-2 bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-40"
                    >
                      <Save size={14} />
                      {saving ? "Saving..." : "Save Section"}
                    </button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {pageSections.length === 0 && (
          <div className="py-12 text-center text-sm text-ink-muted">
            No content sections found for this page.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Visual Editor ─────────────────────────────────────────────── */

function VisualEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown> | unknown[];
  onChange: (updated: Record<string, unknown> | unknown[]) => void;
}) {
  if (Array.isArray(content)) {
    return <ArrayEditor items={content} onChange={onChange} />;
  }

  const entries = Object.entries(content);

  function updateField(key: string, value: unknown) {
    onChange({ ...content, [key]: value });
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => (
        <FieldEditor
          key={key}
          fieldKey={key}
          value={value}
          onChange={(v) => updateField(key, v)}
        />
      ))}
    </div>
  );
}

/* ── Field Editor (renders the right input for each value type) ── */

function FieldEditor({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = friendlyLabel(fieldKey);

  // String
  if (typeof value === "string") {
    const isLong = value.length > 80;
    return (
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-muted">
          {label}
        </label>
        {isLong ? (
          <textarea
            className="w-full border border-rule bg-surface-cream px-4 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type="text"
            className="w-full border border-rule bg-surface-cream px-4 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    );
  }

  // Number
  if (typeof value === "number") {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-muted">
          {label}
        </label>
        <input
          type="number"
          className="w-full border border-rule bg-surface-cream px-4 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    );
  }

  // Boolean
  if (typeof value === "boolean") {
    return (
      <div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded"
          />
          {label}
        </label>
      </div>
    );
  }

  // Simple object with href + text = button/link editor
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "href" in value &&
    "text" in value
  ) {
    const obj = value as Record<string, string>;
    return (
      <div className="border border-rule p-4">
        <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-ink-muted">
          {label}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Button Text
            </label>
            <input
              type="text"
              className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              value={obj.text ?? ""}
              onChange={(e) => onChange({ ...obj, text: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Link URL
            </label>
            <input
              type="text"
              className="w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
              value={obj.href ?? ""}
              onChange={(e) => onChange({ ...obj, href: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  // Array of strings (e.g., bullets, features list)
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-muted">
          {label}
        </label>
        <p className="mb-2 text-[10px] text-ink-muted">One item per line</p>
        <textarea
          className="w-full border border-rule bg-surface-cream px-4 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
          rows={Math.max(3, value.length)}
          value={value.join("\n")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split("\n")
                .filter((line: string) => line.trim() !== "")
            )
          }
        />
      </div>
    );
  }

  // Array of objects (e.g., features, steps, stats)
  if (Array.isArray(value)) {
    return (
      <div className="border border-rule p-4">
        <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-ink-muted">
          {label} ({value.length} items)
        </label>
        <ArrayEditor items={value} onChange={(updated) => onChange(updated)} />
      </div>
    );
  }

  // Generic object — render each sub-field
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    return (
      <div className="border border-rule p-4">
        <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-ink-muted">
          {label}
        </label>
        <div className="space-y-3">
          {Object.entries(obj).map(([subKey, subVal]) => (
            <FieldEditor
              key={subKey}
              fieldKey={subKey}
              value={subVal}
              onChange={(v) => onChange({ ...obj, [subKey]: v })}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/* ── Array Editor ──────────────────────────────────────────────── */

function ArrayEditor({
  items,
  onChange,
}: {
  items: unknown[];
  onChange: (updated: unknown[]) => void;
}) {
  function updateItem(index: number, updated: unknown) {
    const next = [...items];
    next[index] = updated;
    onChange(next);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    if (
      items.length > 0 &&
      typeof items[0] === "object" &&
      items[0] !== null
    ) {
      const template = Object.fromEntries(
        Object.keys(items[0] as Record<string, unknown>).map((k) => [k, ""])
      );
      onChange([...items, template]);
    } else {
      onChange([...items, ""]);
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        if (typeof item === "string") {
          return (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
              />
              <button
                onClick={() => removeItem(index)}
                className="px-2 text-xs text-ink-muted hover:text-editorial-red"
              >
                Remove
              </button>
            </div>
          );
        }

        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          return (
            <div
              key={index}
              className="border border-rule bg-surface-raised/50 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  Item {index + 1}
                </span>
                <button
                  onClick={() => removeItem(index)}
                  className="text-[10px] font-bold uppercase tracking-widest text-ink-muted hover:text-editorial-red"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-3">
                {Object.entries(obj).map(([subKey, subVal]) => (
                  <FieldEditor
                    key={subKey}
                    fieldKey={subKey}
                    value={subVal}
                    onChange={(v) =>
                      updateItem(index, { ...obj, [subKey]: v })
                    }
                  />
                ))}
              </div>
            </div>
          );
        }

        return null;
      })}

      <button
        onClick={addItem}
        className="inline-flex h-8 items-center border border-dashed border-rule px-4 text-xs font-bold uppercase tracking-widest text-ink-muted hover:border-ink hover:text-ink"
      >
        + Add Item
      </button>
    </div>
  );
}
