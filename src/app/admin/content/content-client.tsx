"use client";

import { useState, useTransition } from "react";
import {
  FileText,
  Save,
  Globe,
  Search,
  Brain,
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
};

/* ── Component ─────────────────────────────────────────────────── */

export function ContentClient({ content }: ContentClientProps) {
  const [activeTab, setActiveTab] = useState<string>("homepage");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Track edited content per section id
  const [edits, setEdits] = useState<Record<string, string>>({});

  const pageSections = content.filter((c) => c.page === activeTab);

  function handleSave(row: SiteContentRow) {
    const editedJson = edits[row.id];
    if (!editedJson) return;

    startTransition(async () => {
      const result = await updateSiteContent(row.page, row.section, editedJson);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `"${SECTION_LABELS[row.section] ?? row.section}" saved.` });
        setEdits((prev) => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
      }
      setTimeout(() => setMessage(null), 4000);
    });
  }

  // Stats
  const totalSections = content.length;
  const pageCount = new Set(content.map((c) => c.page)).size;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">Content Manager</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Edit marketing page content. Changes auto-update the public website.
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
              <Globe size={18} strokeWidth={1.5} className="text-editorial-red" />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold tracking-tight text-ink">{pageCount}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Pages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <FileText size={18} strokeWidth={1.5} className="text-editorial-gold" />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold tracking-tight text-ink">{totalSections}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Sections</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Clock size={18} strokeWidth={1.5} className="text-editorial-green" />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold tracking-tight text-ink">
                {pageSections.length}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Active Tab Sections</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tab Navigation ── */}
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

      {/* ── Section Editors ── */}
      <div className="space-y-3">
        {pageSections.map((row) => {
          const isExpanded = expandedSection === row.id;
          const hasEdit = !!edits[row.id];
          const currentJson = hasEdit
            ? edits[row.id]
            : JSON.stringify(row.content, null, 2);

          // Attempt to render structured fields for simple objects
          const isSimpleObject = !Array.isArray(row.content) && typeof row.content === "object";

          return (
            <Card key={row.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedSection(isExpanded ? null : row.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="font-serif text-base">
                      {SECTION_LABELS[row.section] ?? row.section}
                    </CardTitle>
                    <Badge variant="muted">{row.section}</Badge>
                    {hasEdit && <Badge variant="info">Unsaved</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted">
                      {new Date(row.updated_at).toLocaleDateString()}
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 border-t border-rule pt-4">
                  {/* Structured Field Editors for simple objects */}
                  {isSimpleObject && (
                    <StructuredEditor
                      content={row.content as Record<string, unknown>}
                      editedJson={edits[row.id]}
                      onChange={(json) =>
                        setEdits((prev) => ({ ...prev, [row.id]: json }))
                      }
                    />
                  )}

                  {/* Raw JSON editor (always available) */}
                  <div>
                    <h4 className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Raw JSON
                    </h4>
                    <textarea
                      className="h-64 w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-xs text-ink outline-none focus:border-ink"
                      value={currentJson}
                      onChange={(e) =>
                        setEdits((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                    />
                  </div>

                  {/* Save row */}
                  <div className="flex items-center justify-between border-t border-rule pt-4">
                    <p className="text-xs text-ink-muted">
                      Updated: {new Date(row.updated_at).toLocaleString()}
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

/* ── Structured Editor ──────────────────────────────────────────── */

function StructuredEditor({
  content,
  editedJson,
  onChange,
}: {
  content: Record<string, unknown>;
  editedJson?: string;
  onChange: (json: string) => void;
}) {
  // Parse the edited JSON or use original content
  let current: Record<string, unknown>;
  try {
    current = editedJson ? JSON.parse(editedJson) : content;
    if (Array.isArray(current)) return null; // Skip for arrays
  } catch {
    return null; // Invalid JSON, skip structured editor
  }

  function updateField(key: string, value: unknown) {
    const updated = { ...current, [key]: value };
    onChange(JSON.stringify(updated, null, 2));
  }

  const fields = Object.entries(current);

  return (
    <div className="space-y-3">
      <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
        Field Editor
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([key, value]) => {
          // Skip complex objects — they use the JSON editor
          if (typeof value === "object" && value !== null) {
            return (
              <div key={key} className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-secondary">{key}</label>
                <textarea
                  className="h-20 w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-xs text-ink outline-none focus:border-ink"
                  value={JSON.stringify(value, null, 2)}
                  onChange={(e) => {
                    try { updateField(key, JSON.parse(e.target.value)); } catch { /* ignore invalid */ }
                  }}
                />
              </div>
            );
          }

          // String fields — use text input or textarea for long content
          if (typeof value === "string") {
            const isLong = value.length > 100;
            return (
              <div key={key} className={isLong ? "sm:col-span-2" : ""}>
                <label className="mb-1 block text-xs font-medium text-ink-secondary">{key}</label>
                {isLong ? (
                  <textarea
                    className="h-20 w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                    value={value}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    className="h-9 w-full border border-rule bg-surface-cream px-3 text-sm text-ink outline-none focus:border-ink"
                    value={value}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
