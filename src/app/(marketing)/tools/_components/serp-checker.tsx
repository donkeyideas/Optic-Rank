"use client";

import { useState } from "react";
import { Search, Loader2, TrendingUp, DollarSign, BarChart3, Target } from "lucide-react";

interface SerpResult {
  keyword: string;
  source: string;
  search_volume?: number;
  cpc?: number;
  difficulty?: number;
  intent?: string;
  suggestions?: string[];
  position?: number;
  serp_features?: string[];
}

export function SerpCheckerTool() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SerpResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/tools/serp-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check SERP");
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const difficultyColor = !result?.difficulty ? "text-ink-muted"
    : result.difficulty < 30 ? "text-editorial-green"
    : result.difficulty < 60 ? "text-editorial-gold"
    : "text-editorial-red";

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Enter a keyword (e.g., best seo tools)"
            className="h-12 w-full border border-rule bg-surface-cream pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="inline-flex h-12 items-center justify-center bg-editorial-red px-6 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Check"}
        </button>
      </form>

      {error && (
        <div className="mt-4 border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          {/* Keyword Header */}
          <div className="border border-rule p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">Keyword Analysis</p>
            <p className="mt-1 font-serif text-2xl font-bold text-ink">&ldquo;{result.keyword}&rdquo;</p>
            {result.source === "estimated" && (
              <p className="mt-2 text-xs text-ink-muted">
                Estimates based on keyword patterns. Sign up for live data from DataForSEO.
              </p>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="border border-rule p-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-ink-muted" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">Search Volume</p>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-ink">
                {result.search_volume?.toLocaleString() ?? "—"}
              </p>
              <p className="text-xs text-ink-muted">monthly searches</p>
            </div>
            <div className="border border-rule p-4">
              <div className="flex items-center gap-1.5">
                <DollarSign size={14} className="text-ink-muted" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">CPC</p>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-ink">
                ${result.cpc?.toFixed(2) ?? "—"}
              </p>
              <p className="text-xs text-ink-muted">cost per click</p>
            </div>
            <div className="border border-rule p-4">
              <div className="flex items-center gap-1.5">
                <BarChart3 size={14} className="text-ink-muted" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">Difficulty</p>
              </div>
              <p className={`mt-2 font-serif text-2xl font-bold ${difficultyColor}`}>
                {result.difficulty ?? "—"}
              </p>
              <p className="text-xs text-ink-muted">out of 100</p>
            </div>
            <div className="border border-rule p-4">
              <div className="flex items-center gap-1.5">
                <Target size={14} className="text-ink-muted" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">Intent</p>
              </div>
              <p className="mt-2 font-serif text-lg font-bold capitalize text-ink">
                {result.intent ?? "—"}
              </p>
              <p className="text-xs text-ink-muted">search intent</p>
            </div>
          </div>

          {/* Related Keywords */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">Related Keywords</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setKeyword(s); }}
                    className="border border-rule px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:border-editorial-red hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="border-2 border-ink p-6 text-center">
            <p className="font-serif text-lg font-bold text-ink">Want daily tracking for this keyword?</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Sign up for Optic Rank to track keyword rankings daily with AI-powered predictions.
            </p>
            <a
              href="/signup"
              className="mt-4 inline-flex h-10 items-center justify-center bg-editorial-red px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
