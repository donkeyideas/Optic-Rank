"use client";

import { useState } from "react";
import { Search, Loader2, Type, Globe } from "lucide-react";

interface DensityResult {
  phrase: string;
  count: number;
  density: number;
}

interface DensityAnalysis {
  wordCount: number;
  unigrams: DensityResult[];
  bigrams: DensityResult[];
  trigrams: DensityResult[];
}

export function KeywordDensityCheckerTool() {
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DensityAnalysis | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = mode === "url" ? url.trim() : text.trim();
    if (!input) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/tools/keyword-density", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "url" ? { url: input } : { text: input }),
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
      {/* Mode Toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMode("url")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
            mode === "url"
              ? "bg-editorial-red text-white"
              : "border border-rule text-ink-secondary hover:text-ink"
          }`}
        >
          <Globe size={14} /> URL
        </button>
        <button
          onClick={() => setMode("text")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
            mode === "text"
              ? "bg-editorial-red text-white"
              : "border border-rule text-ink-secondary hover:text-ink"
          }`}
        >
          <Type size={14} /> Text
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === "url" ? (
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter a URL to analyze (e.g., example.com/page)"
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
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your text content here..."
              rows={6}
              className="w-full resize-y border border-rule bg-surface-cream p-4 text-sm text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="inline-flex h-12 items-center justify-center bg-editorial-red px-6 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Analyze Density"}
            </button>
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          {/* Word count */}
          <div className="border border-rule p-6 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">Total Words</p>
            <p className="mt-1 font-serif text-4xl font-bold text-ink">{result.wordCount.toLocaleString()}</p>
          </div>

          {/* Unigrams */}
          <DensityTable title="Single Words (1-grams)" data={result.unigrams} />

          {/* Bigrams */}
          <DensityTable title="Two-Word Phrases (2-grams)" data={result.bigrams} />

          {/* Trigrams */}
          <DensityTable title="Three-Word Phrases (3-grams)" data={result.trigrams} />
        </div>
      )}
    </div>
  );
}

function DensityTable({ title, data }: { title: string; data: DensityResult[] }) {
  if (data.length === 0) return null;

  return (
    <div className="border border-rule">
      <div className="border-b border-rule px-4 py-3">
        <h3 className="font-serif text-lg font-bold text-ink">{title}</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-rule text-left">
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted">Keyword</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-ink-muted">Count</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-ink-muted">Density</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.phrase} className="border-b border-rule last:border-b-0">
              <td className="px-4 py-2.5 text-sm font-medium text-ink">{item.phrase}</td>
              <td className="px-4 py-2.5 text-right font-mono text-sm text-ink-secondary">{item.count}</td>
              <td className="px-4 py-2.5 text-right font-mono text-sm text-ink-secondary">{item.density}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
