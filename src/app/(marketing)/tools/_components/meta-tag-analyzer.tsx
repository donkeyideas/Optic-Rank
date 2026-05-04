"use client";

import { useState } from "react";
import { Search, Check, X, AlertTriangle, Loader2 } from "lucide-react";

interface MetaAnalysis {
  url: string;
  title: { value: string; length: number; status: string };
  description: { value: string; length: number; status: string };
  canonical: string | null;
  robots: string | null;
  h1: { count: number; values: string[] };
  wordCount: number;
  ogTags: { title: string | null; description: string | null; image: string | null; type: string | null };
  twitterCard: { card: string | null; title: string | null; description: string | null; image: string | null };
  schemaTypes: string[];
  issues: string[];
  score: number;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "good") return <Check size={14} className="text-editorial-green" />;
  if (status === "warning") return <AlertTriangle size={14} className="text-editorial-gold" />;
  return <X size={14} className="text-editorial-red" />;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-editorial-green border-editorial-green/30"
    : score >= 50 ? "text-editorial-gold border-editorial-gold/30"
    : "text-editorial-red border-editorial-red/30";

  return (
    <div className={`inline-flex items-center gap-2 border px-4 py-2 ${color}`}>
      <span className="font-serif text-3xl font-bold">{score}</span>
      <span className="text-xs font-bold uppercase tracking-widest">/100</span>
    </div>
  );
}

export function MetaTagAnalyzerTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MetaAnalysis | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/tools/meta-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze");
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter a URL to analyze (e.g., example.com)"
            className="h-12 w-full border border-rule bg-surface-cream pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="inline-flex h-12 items-center justify-center bg-editorial-red px-6 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Analyze"}
        </button>
      </form>

      {error && (
        <div className="mt-4 border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          {/* Score */}
          <div className="flex items-center justify-between border border-rule p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">SEO Score</p>
              <p className="mt-1 font-serif text-lg font-bold text-ink">{result.url}</p>
            </div>
            <ScoreBadge score={result.score} />
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">Issues Found ({result.issues.length})</h3>
              <ul className="mt-3 space-y-2">
                {result.issues.map((issue) => (
                  <li key={issue} className="flex items-start gap-2 text-sm text-ink-secondary">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-editorial-gold" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Title */}
          <div className="border border-rule p-6">
            <div className="flex items-center gap-2">
              <StatusIcon status={result.title.status} />
              <h3 className="font-serif text-lg font-bold text-ink">Title Tag</h3>
            </div>
            <p className="mt-2 text-sm text-ink-secondary">{result.title.value || "—"}</p>
            <p className="mt-1 text-xs text-ink-muted">{result.title.length} characters (recommended: 30-60)</p>
          </div>

          {/* Description */}
          <div className="border border-rule p-6">
            <div className="flex items-center gap-2">
              <StatusIcon status={result.description.status} />
              <h3 className="font-serif text-lg font-bold text-ink">Meta Description</h3>
            </div>
            <p className="mt-2 text-sm text-ink-secondary">{result.description.value || "—"}</p>
            <p className="mt-1 text-xs text-ink-muted">{result.description.length} characters (recommended: 70-160)</p>
          </div>

          {/* OG Tags */}
          <div className="border border-rule p-6">
            <h3 className="font-serif text-lg font-bold text-ink">Open Graph Tags</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(result.ogTags).map(([key, val]) => (
                <div key={key} className="flex items-start gap-2">
                  {val ? <Check size={14} className="mt-0.5 text-editorial-green" /> : <X size={14} className="mt-0.5 text-ink-muted" />}
                  <span className="text-sm text-ink-secondary">
                    <span className="font-medium text-ink">og:{key}:</span> {val || "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Schema */}
          <div className="border border-rule p-6">
            <h3 className="font-serif text-lg font-bold text-ink">Structured Data</h3>
            {result.schemaTypes.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.schemaTypes.map((t) => (
                  <span key={t} className="border border-rule px-2 py-1 text-xs font-medium text-ink-secondary">
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No structured data found</p>
            )}
          </div>

          {/* Additional Info */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-rule p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">H1 Tags</p>
              <p className="mt-1 font-serif text-2xl font-bold text-ink">{result.h1.count}</p>
            </div>
            <div className="border border-rule p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">Word Count</p>
              <p className="mt-1 font-serif text-2xl font-bold text-ink">{result.wordCount.toLocaleString()}</p>
            </div>
            <div className="border border-rule p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">Canonical</p>
              <p className="mt-1 font-serif text-2xl font-bold text-ink">{result.canonical ? "Yes" : "No"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
