"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/toast";
import {
  Globe,
  Loader2,
  Sparkles,
  Check,
  Minus,
  AlertCircle,
  Languages,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  analyzeLocalizationOpportunity,
  generateTranslation,
  bulkTranslate,
} from "@/lib/actions/app-store-localization";
import type { AppStoreListing } from "@/types";
import type { AppStoreLocalization } from "@/lib/dal/app-store";

interface LocalizationTabProps {
  listings: AppStoreListing[];
  localizations: AppStoreLocalization[];
}

const SIZE_LABELS: Record<string, string> = {
  very_large: "Very Large",
  large: "Large",
  medium: "Medium",
  small: "Small",
};

export function LocalizationTab({ listings, localizations }: LocalizationTabProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedListing, setSelectedListing] = useState<string>(listings[0]?.id ?? "");
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [markets, setMarkets] = useState<Array<{ code: string; name: string; locale: string; size: string; opportunity_score: number; status: string }>>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set());
  const listingLocalizations = localizations.filter((l) => l.listing_id === selectedListing);
  const autoLoaded = useRef(false);

  // Auto-analyze markets on mount
  useEffect(() => {
    if (autoLoaded.current || !selectedListing || listings.length === 0) return;
    autoLoaded.current = true;
    startTransition(async () => {
      setActionId("analyze");
      const result = await analyzeLocalizationOpportunity(selectedListing);
      if ("markets" in result) setMarkets(result.markets);
      setActionId(null);
    });
  }, [selectedListing, listings.length]);

  // Completeness stats
  const totalMarkets = markets.length || 20;
  const localizedCount = listingLocalizations.length;
  const completeness = totalMarkets > 0 ? Math.round((localizedCount / totalMarkets) * 100) : 0;

  function handleAnalyze() {
    setActionId("analyze");
    startTransition(async () => {
      const result = await analyzeLocalizationOpportunity(selectedListing);
      if ("markets" in result) {
        setMarkets(result.markets);
      } else {
        toast(result.error, "error");
      }
      setActionId(null);
    });
  }

  function handleTranslate(countryCode: string) {
    setActionId(countryCode);
    startTransition(async () => {
      const result = await generateTranslation(selectedListing, countryCode);
      if ("error" in result) {
        toast(result.error, "error");
      } else {
        // Update the local markets state to reflect the translated status
        setMarkets((prev) =>
          prev.map((m) =>
            m.code === countryCode ? { ...m, status: "localized", opportunity_score: 20 } : m
          )
        );
        toast("Translation generated", "success");
        router.refresh();
      }
      setActionId(null);
    });
  }

  function handleBulkTranslate() {
    if (selectedMarkets.size === 0) return;
    setActionId("bulk");
    const codes = Array.from(selectedMarkets);
    startTransition(async () => {
      const result = await bulkTranslate(selectedListing, codes);
      if ("error" in result) {
        toast(result.error, "error");
      } else {
        // Update local markets state for all translated codes
        setMarkets((prev) =>
          prev.map((m) =>
            codes.includes(m.code) ? { ...m, status: "localized", opportunity_score: 20 } : m
          )
        );
        toast(`Translated ${codes.length} markets`, "success");
        router.refresh();
      }
      setSelectedMarkets(new Set());
      setActionId(null);
    });
  }

  function toggleMarket(code: string) {
    setSelectedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  if (listings.length === 0) {
    return <EmptyState icon={Globe} title="No Apps to Localize" description="Add an app listing first to access localization intelligence." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Selector + Actions */}
      <div className="flex items-center gap-3 border-b border-rule pb-3">
        <select
          value={selectedListing}
          onChange={(e) => setSelectedListing(e.target.value)}
          className="h-9 flex-1 border border-rule bg-surface-card px-3 font-sans text-sm text-ink focus:border-editorial-red focus:outline-none"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>{l.app_name} ({l.store === "apple" ? "iOS" : "Android"})</option>
          ))}
        </select>
        <Button variant="primary" size="sm" onClick={handleAnalyze} disabled={actionId === "analyze"}>
          {actionId === "analyze" ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
          Analyze Markets
        </Button>
        {selectedMarkets.size > 0 && (
          <Button variant="outline" size="sm" onClick={handleBulkTranslate} disabled={actionId === "bulk"}>
            {actionId === "bulk" ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
            Translate Selected ({selectedMarkets.size})
          </Button>
        )}
      </div>

      {/* Completeness Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-rule bg-surface-card p-4 text-center">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Markets Localized</span>
          <span className="mt-2 block font-mono text-3xl font-bold text-ink">{localizedCount}</span>
          <span className="text-[11px] text-ink-muted">of {totalMarkets} top markets</span>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Completeness</span>
          <span className={`mt-2 block font-mono text-3xl font-bold ${completeness >= 70 ? "text-editorial-green" : completeness >= 40 ? "text-editorial-gold" : "text-editorial-red"}`}>
            {completeness}%
          </span>
          <div className="mx-auto mt-2 h-1.5 w-full max-w-[120px] overflow-hidden bg-rule">
            <div className={`h-full ${completeness >= 70 ? "bg-editorial-green" : completeness >= 40 ? "bg-editorial-gold" : "bg-editorial-red"}`} style={{ width: `${completeness}%` }} />
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Avg Quality</span>
          <span className="mt-2 block font-mono text-3xl font-bold text-ink">
            {listingLocalizations.length > 0
              ? Math.round(listingLocalizations.reduce((s, l) => s + l.completeness_score, 0) / listingLocalizations.length)
              : "—"}
          </span>
          <span className="text-[11px] text-ink-muted">avg completeness score</span>
        </div>
      </div>

      {/* Market Opportunity Matrix */}
      <ColumnHeader title="Market Opportunity Matrix" subtitle="Top app store markets ranked by opportunity" />

      {markets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Globe size={32} className="text-ink-muted" />
          <span className="text-[12px] text-ink-muted">Click &quot;Analyze Markets&quot; to see localization opportunities</span>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Locale</TableHead>
              <TableHead>Market Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Opportunity</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {markets.map((market) => {
              const localized = listingLocalizations.find((l) => l.country_code === market.code);
              const isEnglish = market.locale.startsWith("en");

              return (
                <TableRow key={market.code}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedMarkets.has(market.code)}
                      onChange={() => toggleMarket(market.code)}
                      disabled={isEnglish || !!localized}
                      className="h-3.5 w-3.5 accent-editorial-red"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-sans text-sm font-semibold text-ink">{market.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-ink-muted">{market.locale}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={market.size === "very_large" ? "danger" : market.size === "large" ? "warning" : "muted"}>
                      {SIZE_LABELS[market.size] ?? market.size}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {localized ? (
                      <div className="flex items-center gap-1 text-editorial-green">
                        <Check size={12} />
                        <span className="text-[11px] font-bold">Localized ({localized.completeness_score}%)</span>
                      </div>
                    ) : isEnglish ? (
                      <div className="flex items-center gap-1 text-ink-muted">
                        <Minus size={12} />
                        <span className="text-[11px]">English OK</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-editorial-red">
                        <AlertCircle size={12} />
                        <span className="text-[11px] font-bold">Not Localized</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden bg-rule">
                        <div
                          className={`h-full ${market.opportunity_score >= 60 ? "bg-editorial-green" : market.opportunity_score >= 30 ? "bg-editorial-gold" : "bg-ink-muted"}`}
                          style={{ width: `${market.opportunity_score}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-bold">{market.opportunity_score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {!localized && !isEnglish && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTranslate(market.code)}
                        disabled={actionId === market.code}
                      >
                        {actionId === market.code ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        Translate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Existing Localizations */}
      {listingLocalizations.length > 0 && (
        <div className="border-t border-rule pt-4">
          <ColumnHeader title="Existing Translations" subtitle={`${listingLocalizations.length} locales translated`} />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {listingLocalizations.map((loc) => (
              <div key={loc.id} className="border border-rule bg-surface-card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ink">{loc.country_code}</span>
                    <span className="text-[11px] text-ink-muted">{loc.locale}</span>
                    {loc.ai_translated && <Badge variant="muted">AI</Badge>}
                  </div>
                  <span className={`font-mono text-xs font-bold ${loc.completeness_score >= 75 ? "text-editorial-green" : loc.completeness_score >= 50 ? "text-editorial-gold" : "text-editorial-red"}`}>
                    {loc.completeness_score}%
                  </span>
                </div>
                {loc.localized_title && (
                  <div className="mt-2">
                    <span className="text-[9px] font-bold uppercase text-ink-muted">Title: </span>
                    <span className="text-[11px] text-ink">{loc.localized_title}</span>
                  </div>
                )}
                {loc.localized_subtitle && (
                  <div>
                    <span className="text-[9px] font-bold uppercase text-ink-muted">Subtitle: </span>
                    <span className="text-[11px] text-ink">{loc.localized_subtitle}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
