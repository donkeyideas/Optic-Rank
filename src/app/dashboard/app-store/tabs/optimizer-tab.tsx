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
  Search,
  Users,
  MessageSquare,
  Globe,
  Megaphone,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { AppSelectorStrip } from "@/components/app-store/app-selector-strip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useActionProgress } from "@/components/shared/action-progress";

import {
  scoreMetadata,
  generateTitleVariants,
  generateSubtitleVariant,
  generateDescriptionVariant,
  generateKeywordField,
  generateFullListingRecommendation,
} from "@/lib/actions/app-store-optimizer";
import type { AppStoreListing } from "@/types";

interface OptimizerTabProps {
  listings: AppStoreListing[];
}

type FullRecommendation = {
  title: string;
  subtitle: string;
  description: string;
  keywordsField: string;
  promotionalText: string;
  analysis: string;
  dataSources: { keywords: number; competitors: number; reviewTopics: number; locales: number };
};

export function OptimizerTab({ listings }: OptimizerTabProps) {
  const [selectedListing, setSelectedListing] = useState<string>(listings[0]?.id ?? "");
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const { runAction } = useActionProgress();

  const listing = useMemo(() => listings.find((l) => l.id === selectedListing), [listings, selectedListing]);

  // Editable metadata state
  const [title, setTitle] = useState(String(listing?.app_name ?? ""));
  const [subtitle, setSubtitle] = useState(String(listing?.subtitle ?? ""));
  const [description, setDescription] = useState(
    typeof listing?.description === "string" ? listing.description : ""
  );
  const [keywordsField, setKeywordsField] = useState(String(listing?.keywords_field ?? ""));
  const [promotionalText, setPromotionalText] = useState(String(listing?.promotional_text ?? ""));

  // Live scoring
  const initialScore = useMemo(() => {
    if (!listing) return null;
    const store = listing.store as "apple" | "google";
    const isApple = store === "apple";
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
    else recs.push(isApple ? "Add a subtitle." : "Add a short description.");

    const desc = typeof listing.description === "string" ? listing.description : "";
    const dLen = desc.trim().length;
    const descMax = isApple ? 20 : 25;
    if (dLen >= 1000) score += descMax;
    else if (dLen >= 500) { score += Math.round(descMax * 0.72); recs.push("Expand description to 1000+ chars."); }
    else if (dLen > 0) { score += Math.round(descMax * 0.4); recs.push("Description too short."); }
    else recs.push("Add a description.");

    if (isApple) {
      const kwLen = (listing.keywords_field ?? "").trim().length;
      if (kwLen >= 80) score += 10;
      else if (kwLen >= 50) { score += 7; recs.push(`Keywords: ${kwLen}/100 chars.`); }
      else if (kwLen > 0) { score += 4; recs.push(`Only ${kwLen}/100 keyword chars.`); }
      else recs.push("Keywords field is empty!");

      const promoLen = (listing.promotional_text ?? "").trim().length;
      if (promoLen >= 100) score += 10;
      else if (promoLen >= 50) { score += 6; recs.push("Expand promotional text."); }
      else if (promoLen > 0) { score += 3; recs.push("Promotional text too short."); }
      else recs.push("Add promotional text (170 chars).");
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

  // Full AI recommendation
  const [recommendation, setRecommendation] = useState<FullRecommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  // Reset fields when listing selection changes
  const handleListingChange = useCallback((newId: string) => {
    setSelectedListing(newId);
    const l = listings.find((x) => x.id === newId);
    if (l) {
      setTitle(String(l.app_name ?? ""));
      setSubtitle(String(l.subtitle ?? ""));
      setDescription(typeof l.description === "string" ? l.description : "");
      setKeywordsField(String(l.keywords_field ?? ""));
      setPromotionalText(String(l.promotional_text ?? ""));
      setLiveScore(null);
      setTitleVariants([]);
      setGeneratedSubtitle(null);
      setGeneratedDesc(null);
      setGeneratedKeywords(null);
      setRecommendation(null);
    }
  }, [listings]);

  // Debounced server-side scoring
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!listing) return;
      const store = listing.store as "apple" | "google";
      const descStr = typeof description === "string" ? description : "";
      startTransition(async () => {
        try {
          const result = await scoreMetadata(store, title, subtitle, descStr, keywordsField, promotionalText);
          setLiveScore(result);
        } catch { /* keep previous */ }
      });
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, subtitle, description, keywordsField, promotionalText, listing]);

  // Full AI recommendation
  function handleGenerateFullRecommendation() {
    if (!selectedListing) return;
    setRecLoading(true);
    runAction(
      {
        title: "Generating Optimized Listing",
        description: "AI is analyzing keywords, competitors, and reviews to maximize visibility",
        steps: [
          "Analyzing keyword rankings & visibility data",
          "Evaluating competitor landscape",
          "Processing user reviews & sentiment",
          "Generating visibility-optimized listing",
        ],
        estimatedDuration: 25,
      },
      () => generateFullListingRecommendation(selectedListing)
    ).then((result) => {
      if (result && "recommendation" in result) setRecommendation(result.recommendation);
      setRecLoading(false);
    });
  }

  // Apply full recommendation to all fields
  function applyRecommendation() {
    if (!recommendation) return;
    setTitle(recommendation.title);
    setSubtitle(recommendation.subtitle);
    setDescription(recommendation.description);
    if (listing?.store === "apple") {
      if (recommendation.keywordsField) setKeywordsField(recommendation.keywordsField);
      if (recommendation.promotionalText) setPromotionalText(recommendation.promotionalText);
    }
  }

  function handleGenerateTitles() {
    if (!selectedListing) return;
    setActionId("titles");
    const keywords = keywordsField.split(",").map((k) => k.trim()).filter(Boolean);
    runAction(
      { title: "Generating Title Variants", description: "AI is crafting visibility-optimized titles", estimatedDuration: 15 },
      () => generateTitleVariants(selectedListing, keywords)
    ).then((result) => {
      if (result && "variants" in result) setTitleVariants(result.variants);
      setActionId(null);
    });
  }

  function handleGenerateSubtitle() {
    if (!selectedListing) return;
    setActionId("subtitle");
    runAction(
      { title: "Generating Subtitle", description: "AI is optimizing subtitle for keyword ranking", estimatedDuration: 12 },
      () => generateSubtitleVariant(selectedListing)
    ).then((result) => {
      if (result && "subtitle" in result) setGeneratedSubtitle(result.subtitle);
      setActionId(null);
    });
  }

  function handleGenerateDescription() {
    if (!selectedListing) return;
    setActionId("desc");
    runAction(
      { title: "Generating Description", description: "AI is writing a visibility-optimized description", estimatedDuration: 20 },
      () => generateDescriptionVariant(selectedListing)
    ).then((result) => {
      if (result && "description" in result) setGeneratedDesc(result.description);
      setActionId(null);
    });
  }

  function handleGenerateKeywords() {
    if (!selectedListing) return;
    setActionId("kw");
    runAction(
      { title: "Generating Keywords", description: "AI is selecting highest-impact keywords for visibility", estimatedDuration: 12 },
      () => generateKeywordField(selectedListing)
    ).then((result) => {
      if (result && "keywords" in result) setGeneratedKeywords(result.keywords);
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

  const maxTitleLen = 30;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-rule pb-4">
        <h2 className="font-serif text-xl font-bold text-ink">Optimizer</h2>
        <p className="mt-1 max-w-2xl font-sans text-[13px] text-ink-secondary">
          AI-powered ASO metadata editor with live scoring, keyword analysis, and one-click optimized listing generation.
        </p>
      </div>
      <AppSelectorStrip listings={listings} selected={selectedListing} onSelect={handleListingChange} />

      {/* AI Full Listing Recommendation */}
      <div className="border border-rule bg-surface-card">
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">AI Store Listing Optimizer</span>
            <p className="mt-0.5 text-[11px] text-ink-secondary">
              AI analyzes your keywords, competitors, reviews, and locale data to maximize organic visibility and downloads.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={handleGenerateFullRecommendation} disabled={recLoading}>
            {recLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {recLoading ? "Analyzing..." : "Generate Optimized Listing"}
          </Button>
        </div>

        {recommendation && (
          <div className="flex flex-col gap-0">
            {/* Data Sources Strip */}
            <div className="flex items-center gap-4 border-b border-rule px-4 py-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Data Analyzed:</span>
              <div className="flex items-center gap-1">
                <Search size={10} className="text-editorial-green" />
                <span className="font-mono text-[10px] font-bold text-ink">{recommendation.dataSources.keywords}</span>
                <span className="text-[10px] text-ink-muted">keywords</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={10} className="text-editorial-green" />
                <span className="font-mono text-[10px] font-bold text-ink">{recommendation.dataSources.competitors}</span>
                <span className="text-[10px] text-ink-muted">competitors</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare size={10} className="text-editorial-green" />
                <span className="font-mono text-[10px] font-bold text-ink">{recommendation.dataSources.reviewTopics}</span>
                <span className="text-[10px] text-ink-muted">review topics</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe size={10} className="text-editorial-green" />
                <span className="font-mono text-[10px] font-bold text-ink">{recommendation.dataSources.locales}</span>
                <span className="text-[10px] text-ink-muted">locales</span>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="border-b border-rule px-4 py-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">AI Strategy</span>
              <p className="mt-1 font-sans text-[12px] leading-relaxed text-ink-secondary">{recommendation.analysis}</p>
            </div>

            {/* Recommended Fields */}
            <div className="grid gap-0 divide-y divide-rule">
              {/* Title */}
              <div className="flex items-start justify-between px-4 py-3">
                <div className="flex-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Recommended Title</span>
                  <p className="mt-1 font-serif text-[15px] font-bold text-ink">{recommendation.title}</p>
                  <span className="font-mono text-[10px] text-ink-muted">{recommendation.title.length}/30 chars</span>
                </div>
                <button onClick={() => { setTitle(recommendation.title); }} className="mt-1 text-[10px] font-bold text-editorial-red hover:underline">
                  Use
                </button>
              </div>

              {/* Subtitle */}
              <div className="flex items-start justify-between px-4 py-3">
                <div className="flex-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Recommended {listing?.store === "apple" ? "Subtitle" : "Short Description"}
                  </span>
                  <p className="mt-1 font-sans text-sm text-ink">{recommendation.subtitle}</p>
                  <span className="font-mono text-[10px] text-ink-muted">
                    {recommendation.subtitle.length}/{listing?.store === "apple" ? 30 : 80} chars
                  </span>
                </div>
                <button onClick={() => { setSubtitle(recommendation.subtitle); }} className="mt-1 text-[10px] font-bold text-editorial-red hover:underline">
                  Use
                </button>
              </div>

              {/* Description */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Recommended Description</span>
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(recommendation.description, "rec-desc")} className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink">
                      {copiedField === "rec-desc" ? <Check size={10} /> : <Copy size={10} />}
                      {copiedField === "rec-desc" ? "Copied" : "Copy"}
                    </button>
                    <button onClick={() => { setDescription(recommendation.description); }} className="text-[10px] font-bold text-editorial-red hover:underline">
                      Use
                    </button>
                  </div>
                </div>
                <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-ink-secondary">
                  {recommendation.description}
                </div>
                <span className="mt-1 block font-mono text-[10px] text-ink-muted">{recommendation.description.length}/4000 chars</span>
              </div>

              {/* Keywords Field (iOS) */}
              {listing?.store === "apple" && recommendation.keywordsField && (
                <div className="flex items-start justify-between px-4 py-3">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Recommended Keywords Field</span>
                    <p className="mt-1 font-mono text-[11px] text-ink-secondary">{recommendation.keywordsField}</p>
                    <span className="font-mono text-[10px] text-ink-muted">{recommendation.keywordsField.length}/100 chars</span>
                  </div>
                  <button onClick={() => { setKeywordsField(recommendation.keywordsField); }} className="mt-1 text-[10px] font-bold text-editorial-red hover:underline">
                    Use
                  </button>
                </div>
              )}

              {/* Promotional Text (iOS) */}
              {listing?.store === "apple" && recommendation.promotionalText && (
                <div className="flex items-start justify-between px-4 py-3">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Recommended Promotional Text</span>
                    <p className="mt-1 font-sans text-[12px] text-ink-secondary">{recommendation.promotionalText}</p>
                    <span className="font-mono text-[10px] text-ink-muted">{recommendation.promotionalText.length}/170 chars</span>
                  </div>
                  <button onClick={() => { setPromotionalText(recommendation.promotionalText); }} className="mt-1 text-[10px] font-bold text-editorial-red hover:underline">
                    Use
                  </button>
                </div>
              )}
            </div>

            {/* Apply All Button */}
            <div className="border-t border-rule px-4 py-3">
              <Button variant="primary" size="sm" onClick={applyRecommendation}>
                Apply All Recommendations
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Editor */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ColumnHeader title="ASO Metadata Editor" subtitle="Fine-tune your store listing or use AI to generate individual fields" />

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
                Generate
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

          {/* Promotional Text (iOS only) */}
          {listing?.store === "apple" && (
            <div className="border border-rule bg-surface-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone size={14} className="text-ink-muted" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Promotional Text</span>
                  <span className={`font-mono text-[10px] ${promotionalText.length > 170 ? "text-editorial-red" : promotionalText.length >= 100 ? "text-editorial-green" : "text-ink-muted"}`}>
                    {promotionalText.length}/170
                  </span>
                </div>
              </div>
              <textarea
                value={promotionalText}
                onChange={(e) => setPromotionalText(e.target.value)}
                rows={3}
                placeholder="Highlight current promotions, seasonal content, or new features. This appears above your description and can be updated without submitting a new app version."
                className="mt-2 w-full border border-rule bg-surface-raised px-3 py-2 font-sans text-[12px] leading-relaxed text-ink focus:border-editorial-red focus:outline-none"
              />
              <span className="mt-1 block text-[9px] text-ink-muted">
                Appears above your description. Can be changed anytime without a new release.
              </span>
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

            {keywordsField && (
              <div className="mt-4 border-t border-rule pt-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Keyword Presence</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {keywordsField.split(",").map((kw) => kw.trim()).filter(Boolean).slice(0, 15).map((kw) => {
                    const inTitle = title.toLowerCase().includes(kw.toLowerCase());
                    const inDesc = description.toLowerCase().includes(kw.toLowerCase());
                    const inPromo = listing?.store === "apple" && promotionalText.toLowerCase().includes(kw.toLowerCase());
                    return (
                      <div key={kw} className="flex items-center gap-1 border border-rule px-1.5 py-0.5">
                        <span className="text-[10px] text-ink">{kw}</span>
                        <span className={`text-[8px] font-bold ${inTitle ? "text-editorial-green" : "text-editorial-red"}`}>T</span>
                        <span className={`text-[8px] font-bold ${inDesc ? "text-editorial-green" : "text-editorial-red"}`}>D</span>
                        {listing?.store === "apple" && (
                          <span className={`text-[8px] font-bold ${inPromo ? "text-editorial-green" : "text-editorial-red"}`}>P</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <span className="mt-1 block text-[9px] text-ink-muted">T=Title D=Description{listing?.store === "apple" ? " P=Promo" : ""}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
