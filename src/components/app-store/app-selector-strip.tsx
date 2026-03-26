"use client";

import { Smartphone } from "lucide-react";
import { StoreBadge } from "@/components/app-store/store-badge";
import type { AppStoreListing } from "@/types";

interface AppSelectorStripProps {
  listings: AppStoreListing[];
  selected: string;
  onSelect: (id: string) => void;
  /** Show an "All Apps" option at the start */
  showAll?: boolean;
}

export function AppSelectorStrip({
  listings,
  selected,
  onSelect,
  showAll = false,
}: AppSelectorStripProps) {
  if (listings.length <= 1 && !showAll) return null;

  return (
    <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
        App
      </span>

      {showAll && (
        <button
          type="button"
          onClick={() => onSelect("all")}
          className={`flex shrink-0 items-center gap-2 border px-3 py-2 text-left transition-colors ${
            selected === "all"
              ? "border-editorial-red bg-editorial-red/5"
              : "border-rule bg-surface-card hover:border-rule-dark"
          }`}
        >
          <div className="flex h-6 w-6 items-center justify-center border border-rule bg-surface-raised">
            <Smartphone size={12} className="text-ink-muted" />
          </div>
          <span className="text-[12px] font-bold text-ink">All Apps</span>
        </button>
      )}

      {listings.map((listing) => {
        const isSelected = listing.id === selected;
        return (
          <button
            key={listing.id}
            type="button"
            onClick={() => onSelect(listing.id)}
            className={`flex shrink-0 items-center gap-2 border px-3 py-2 text-left transition-colors ${
              isSelected
                ? "border-editorial-red bg-editorial-red/5"
                : "border-rule bg-surface-card hover:border-rule-dark"
            }`}
          >
            {listing.icon_url ? (
              <img
                src={listing.icon_url}
                alt=""
                referrerPolicy="no-referrer"
                className="h-6 w-6 border border-rule object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center border border-rule bg-surface-raised">
                <Smartphone size={12} className="text-ink-muted" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[12px] font-bold leading-tight text-ink">
                {listing.app_name}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-ink-muted">
                {listing.store === "apple" ? "iOS" : "Google Play"}
                <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${listing.store === "apple" ? "bg-black text-white" : "bg-[#01875f] text-white"}`}>
                  <StoreBadge store={listing.store} size="xs" />
                </span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
