"use client";

import { useState, useTransition, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Target,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Type,
  AlignLeft,
  Key,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

import {
  scoreMetadata,
  generateTitleVariants,
  generateSubtitleVariant,
  generateDescriptionVariant,
  generateKeywordField,
} from "@/lib/actions/app-store-optimizer";
import type { AppStoreListing } from "@/types";

interface OptimizerTabProps {
  listings: AppStoreListing[];
}

export function OptimizerTab({ listings }: OptimizerTabProps) {
  const [selectedListing, setSelectedListing] = useState<string>(listings[0]?.id ?? "");
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  const listing = useMemo(() => listings.find((l) => l.id === selectedListing), [listings, selectedListing]);

  // Editable metadata state — ensure all values are plain strings
  const [title, setTitle] = useState(String(listing?.app_name ?? ""));
  const [subtitle, setSubtitle] = useState(String(listing?.subtitle ?? ""));
  const [description, setDescription] = useState(
    typeof listing?.description === "string" ? listing.description : ""
  );
  const [keywordsField, setKeywordsField] = useState(String(listing?.keywords_field ?? ""));

  // Live scoring — compute initial score immediately via useMemo
  const initialScore = useMemo(() => {
    if (!listing) return null;
    const store = listing.store as "apple" | "google";
    let score = 0;
    const recs: string[] = [];
    const maxTitle = 30;
    const tLen = (listing.app_name ?? "").trim().length;
    if (tLen >= 15 && tLen <= maxTitle) score += 25;
    else if (tLen > 0) { score += 10; recs.push(`Title: ${tLen}/${maxTitle} chars`); }
    else recs.push("Add a title.");

    const sLen = (listing.subtitle ?? "").trim().length;
    if (sLen >= 10) score += 15;
    else if (sLen > 0) score += 8;
    else recs.push(store === "apple" ? "Add a subtitle." : "Add a short description.");

    const desc = typeof listing.description === "string" ? listing.description : "";
    const dLen = desc.trim().length;
    if (dLen >= 1000) score += 25;
    else if (dLen >= 500) { score += 18; recs.push("Expand description to 1000+ chars."); }
    else if (dLen > 0) { score += 10; recs.push("Description too short."); }
    else recs.push("Add a description.");

    if (store === "apple") {
      const kwLen = (listing.keywords_field ?? "").trim().length;
      if (kwLen >= 80) score += 15;
      else if (kwLen >= 50) { score += 10; recs.push(`Keywords: ${kwLen}/100 chars.`); }
      else if (kwLen > 0) { score += 5; recs.push(`Only ${kwLen}/100 keyword chars.`); }
      else recs.push("Keywords field is empty!");
    } else { score += 15; }

    if (dLen > 100) score += 10;
    return { score: Math.min(100, Math.max(0, score)), recommendations: recs };
  }, [listing]);

  const [liveScore, setLiveScore] = useState<{ score: number; recommendations: string[] } | null>(initialScore);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generated variants
  const [titleVariants, setTitleVariants] = useState<Array<{ title: string; score: number; reason: string }>>([]);
  const [generatedSubtitle, setGeneratedSubtitle] = useState<string | null>(null);
  const [generatedDesc, setGeneratedDesc] = useState<string | null>(null);
  const [generatedKeywords, setGeneratedKeywords] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const autoGenRef = useRef(false);

  // Auto-generate ALL optimizer fields on mount (title variants, subtitle, description, keywords)
  useEffect(() => {
    if (autoGenRef.current || !selectedListing || !listing) return;
    autoGenRef.current = true;

    startTransition(async () => {
      try {
        const promises: Promise<void>[] = [];

        // 1. Title variants — always generate
        promises.push(
          generateTitleVariants(selectedListing, []).then((r) => {
            if ("variants" in r) setTitleVariants(r.variants);
          })
        );

        // 2. Subtitle — generate if empty, show as suggestion if already filled
        promises.push(
          generateSubtitleVariant(selectedListing).then((r) => {
            if ("subtitle" in r) {
              if (!(listing.subtitle ?? "").trim()) {
                setSubtitle(r.subtitle);
              } else {
                setGeneratedSubtitle(r.subtitle);
              }
            }
          })
        );

        // 3. Description — always generate AI rewrite as suggestion
        promises.push(
          generateDescriptionVariant(selectedListing).then((r) => {
            if ("description" in r) setGeneratedDesc(r.description);
          })
        );

        // 4. Keywords field (iOS) — generate if empty, show as suggestion if filled
        if (listing.store === "apple") {
          promises.push(
            generateKeywordField(selectedListing).then((r) => {
              if ("keywords" in r) {
                if (!(listing.keywords_field ?? "").trim()) {
                  setKeywordsField(r.keywords);
                } else {
                  setGeneratedKeywords(r.keywords);
                }
              }
            })
          );
        }

        await Promise.all(promises);
      } catch {
        // Non-critical — user can still manually click buttons
      }
    });
  }, [selectedListing, listing]);

  // Reset fields when listing selection changes — via onChange handler
  const handleListingChange = useCallback((newId: string) => {
    setSelectedListing(newId);
    autoGenRef.current = false; // Allow auto-gen for the new listing
    const l = listings.find((x) => x.id === newId);
    if (l) {
      setTitle(String(l.app_name ?? ""));
      setSubtitle(String(l.subtitle ?? ""));
      setDescription(typeof l.description === "string" ? l.description : "");
      setKeywordsField(String(l.keywords_field ?? ""));
      setLiveScore(null);
      setTitleVariants([]);
      setGeneratedSubtitle(null);
      setGeneratedDesc(null);
      setGeneratedKeywords(null);
    }
  }, [listings]);

  // Debounced server-side scoring for precision (initial score already set via useMemo)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!listing) return;
      const store = listing.store as "apple" | "google";
      const descStr = typeof description === "string" ? description : "";
      startTransition(async () => {
        try {
          const result = await scoreMetadata(store, title, subtitle, descStr, keywordsField);
          setLiveScore(result);
        } catch {
          // Keep initial/previous score on error
        }
      });
    }, 600);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, subtitle, description, keywordsField, listing]);

  function handleGenerateTitles() {
    if (!selectedListing) return;
    setActionId("titles");
    const keywords = keywordsField.split(",").map((k) => k.trim()).filter(Boolean);
    startTransition(async () => {
      const result = await generateTitleVariants(selectedListing, keywords);
      if ("variants" in result) setTitleVariants(result.variants);
      setActionId(null);
    });
  }

  function handleGenerateSubtitle() {
    if (!selectedListing) return;
    setActionId("subtitle");
    startTransition(async () => {
      const result = await generateSubtitleVariant(selectedListing);
      if ("subtitle" in result) setGeneratedSubtitle(result.subtitle);
      setActionId(null);
    });
  }

  function handleGenerateDescription() {
    if (!selectedListing) return;
    setActionId("desc");
    startTransition(async () => {
      const result = await generateDescriptionVariant(selectedListing);
      if ("description" in result) setGeneratedDesc(result.description);
      setActionId(null);
    });
  }

  function handleGenerateKeywords() {
    if (!selectedListing) return;
    setActionId("kw");
    startTransition(async () => {
      const result = await generateKeywordField(selectedListing);
      if ("keywords" in result) setGeneratedKeywords(result.keywords);
      setActionId(null);
    });
  }

  const copyToClipboard = useCallback((text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  if (listings.length === 0) {
    return <EmptyState icon={Target} title="No Apps to Optimize" description="Add an app listing first to use the ASO optimizer." />;
  }

  const maxTitleLen = 30; // Both Apple and Google Play limit titles to 30 characters

  return (
    <div className="flex flex-col gap-4">
      {/* App Selector */}
      <div className="flex items-center gap-3 border-b border-rule pb-3">
        <select
          value={selectedListing}
          onChange={(e) => handleListingChange(e.target.value)}
          className="h-9 flex-1 border border-rule bg-surface-card px-3 font-sans text-sm text-ink focus:border-editorial-red focus:outline-none"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>{l.app_name} ({l.store === "apple" ? "iOS" : "Android"})</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Editor */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ColumnHeader title="ASO Metadata Editor" subtitle="Edit and optimize your store listing in real-time" />

          {/* Title */}
          <div className="border border-rule bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type size={14} className="text-ink-muted" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Title</span>
                <span className={`font-mono text-[10px] ${title.length > maxTitleLen ? "text-editorial-red" : "text-ink-muted"}`}>
                  {title.length}/{maxTitleLen}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerateTitles} disabled={actionId === "titles"}>
                {actionId === "titles" ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                AI Variants
              </Button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 h-10 w-full border border-rule bg-surface-raised px-3 font-serif text-[15px] font-bold text-ink focus:border-editorial-red focus:outline-none"
            />
            {titleVariants.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-green">AI-Generated Variants</span>
                {titleVariants.map((v, i) => (
                  <div key={i} className="flex items-center justify-between border border-rule px-3 py-2 hover:bg-surface-raised">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink">{v.title}</span>
                      <span className="font-mono text-[10px] text-ink-muted">{v.title.length}ch</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-bold ${v.score >= 80 ? "text-editorial-green" : v.score >= 60 ? "text-editorial-gold" : "text-editorial-red"}`}>
                        {v.score}
                      </span>
                      <button onClick={() => { setTitle(v.title); setTitleVariants([]); }} className="text-[10px] font-bold text-editorial-red hover:underline">
                        Use
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subtitle */}
          <div className="border border-rule bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type size={14} className="text-ink-muted" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  {listing?.store === "apple" ? "Subtitle" : "Short Description"}
                </span>
                <span className={`font-mono text-[10px] ${subtitle.length > (listing?.store === "apple" ? 30 : 80) ? "text-editorial-red" : "text-ink-muted"}`}>
                  {subtitle.length}/{listing?.store === "apple" ? 30 : 80}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerateSubtitle} disabled={actionId === "subtitle"}>
                {actionId === "subtitle" ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                AI Generate
              </Button>
            </div>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="mt-2 h-9 w-full border border-rule bg-surface-raised px-3 font-sans text-sm text-ink focus:border-editorial-red focus:outline-none"
            />
            {generatedSubtitle && (
              <div className="mt-2 flex items-center gap-2 border border-editorial-green/30 bg-editorial-green/5 px-3 py-2">
                <span className="flex-1 font-sans text-[12px] text-ink-secondary">{generatedSubtitle}</span>
                <span className="font-mono text-[10px] text-ink-muted">{generatedSubtitle.length}ch</span>
                <button onClick={() => { setSubtitle(generatedSubtitle); setGeneratedSubtitle(null); }} className="text-[10px] font-bold text-editorial-red hover:underline">
                  Use
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="border border-rule bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlignLeft size={14} className="text-ink-muted" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Description</span>
                <span className={`font-mono text-[10px] ${description.length > 4000 ? "text-editorial-red" : "text-ink-muted"}`}>
                  {description.length}/4000
                </span>
              </div>
              <div className="flex gap-2">
                {description.length > 0 && (
                  <button onClick={() => copyToClipboard(description, "desc-main")} className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink">
                    {copiedField === "desc-main" ? <Check size={10} /> : <Copy size={10} />}
                    {copiedField === "desc-main" ? "Copied" : "Copy"}
                  </button>
                )}
                <Button variant="outline" size="sm" onClick={handleGenerateDescription} disabled={actionId === "desc"}>
                  {actionId === "desc" ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  AI Rewrite
                </Button>
              </div>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="mt-2 w-full border border-rule bg-surface-raised px-3 py-2 font-sans text-[12px] leading-relaxed text-ink focus:border-editorial-red focus:outline-none"
            />
            {generatedDesc && (
              <div className="mt-3 border border-editorial-green/30 bg-editorial-green/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-green">AI-Optimized Version</span>
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(generatedDesc, "desc")} className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink">
                      {copiedField === "desc" ? <Check size={10} /> : <Copy size={10} />}
                      {copiedField === "desc" ? "Copied" : "Copy"}
                    </button>
                    <button onClick={() => { setDescription(generatedDesc); setGeneratedDesc(null); }} className="text-[10px] font-bold text-editorial-red hover:underline">
                      Use This
                    </button>
                  </div>
                </div>
                <div className="mt-2 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-ink-secondary">{generatedDesc}</div>
              </div>
            )}
          </div>

          {/* Keywords Field (iOS) */}
          {listing?.store === "apple" && (
            <div className="border border-rule bg-surface-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-ink-muted" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Keywords Field</span>
                  <span className={`font-mono text-[10px] ${keywordsField.length > 100 ? "text-editorial-red" : keywordsField.length >= 90 ? "text-editorial-green" : "text-ink-muted"}`}>
                    {keywordsField.length}/100
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerateKeywords} disabled={actionId === "kw"}>
                  {actionId === "kw" ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  AI Optimize
                </Button>
              </div>
              <input
                type="text"
                value={keywordsField}
                onChange={(e) => setKeywordsField(e.target.value)}
                placeholder="keyword1,keyword2,keyword3"
                className="mt-2 h-9 w-full border border-rule bg-surface-raised px-3 font-mono text-sm text-ink focus:border-editorial-red focus:outline-none"
              />
              {generatedKeywords && (
                <div className="mt-2 flex items-center gap-2 border border-editorial-green/30 bg-editorial-green/5 px-3 py-2">
                  <span className="flex-1 font-mono text-[11px] text-ink-secondary">{generatedKeywords}</span>
                  <span className="font-mono text-[10px] text-ink-muted">{generatedKeywords.length}ch</span>
                  <button onClick={() => { setKeywordsField(generatedKeywords); setGeneratedKeywords(null); }} className="text-[10px] font-bold text-editorial-red hover:underline">
                    Use
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Live Score Panel */}
        <div className="flex flex-col gap-4">
          <div className="sticky top-4 border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Live ASO Score</span>
            <div className="mt-3 text-center">
              <span className={`font-mono text-5xl font-bold ${
                (liveScore?.score ?? 0) >= 80 ? "text-editorial-green"
                : (liveScore?.score ?? 0) >= 60 ? "text-editorial-gold"
                : (liveScore?.score ?? 0) >= 40 ? "text-editorial-gold"
                : "text-editorial-red"
              }`}>
                {liveScore?.score ?? "—"}
              </span>
              <span className="block mt-1 font-mono text-sm text-ink-muted">/100</span>
            </div>

            {/* Score Breakdown Bar */}
            <div className="mt-4 h-2 w-full overflow-hidden bg-rule">
              <div
                className={`h-full transition-all duration-500 ${
                  (liveScore?.score ?? 0) >= 80 ? "bg-editorial-green"
                  : (liveScore?.score ?? 0) >= 60 ? "bg-editorial-gold"
                  : "bg-editorial-red"
                }`}
                style={{ width: `${liveScore?.score ?? 0}%` }}
              />
            </div>

            {/* Recommendations */}
            {liveScore && liveScore.recommendations.length > 0 && (
              <div className="mt-4 border-t border-rule pt-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Recommendations</span>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {liveScore.recommendations.map((rec, idx) => (
                    <li key={idx} className="font-sans text-[11px] leading-relaxed text-ink-secondary">
                      &bull; {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Keyword Density */}
            {keywordsField && (
              <div className="mt-4 border-t border-rule pt-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Keyword Presence</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {keywordsField.split(",").map((kw) => kw.trim()).filter(Boolean).slice(0, 15).map((kw) => {
                    const inTitle = title.toLowerCase().includes(kw.toLowerCase());
                    const inDesc = description.toLowerCase().includes(kw.toLowerCase());
                    return (
                      <div key={kw} className="flex items-center gap-1 border border-rule px-1.5 py-0.5">
                        <span className="text-[10px] text-ink">{kw}</span>
                        <span className={`text-[8px] font-bold ${inTitle ? "text-editorial-green" : "text-editorial-red"}`}>T</span>
                        <span className={`text-[8px] font-bold ${inDesc ? "text-editorial-green" : "text-editorial-red"}`}>D</span>
                      </div>
                    );
                  })}
                </div>
                <span className="mt-1 block text-[9px] text-ink-muted">T=Title D=Description</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
