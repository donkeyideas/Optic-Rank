"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  refreshAppListing,
  analyzeAppListing,
  generateAppKeywords,
  refreshKeywordRankings,
} from "./app-store";
import { extractReviewTopics } from "./app-store-reviews-intel";
import { discoverCompetitors, refreshCompetitors } from "./app-store-competitors";
import { recordSnapshot, trackVersionChange } from "./app-store-versions";
import { analyzeLocalizationOpportunity, generateTranslation } from "./app-store-localization";

/**
 * Full ASO sync for all app listings in a project.
 * Runs: refresh store data → generate keywords → check rankings →
 *       discover competitors → refresh competitors → analyze ASO →
 *       extract review topics → record snapshot →
 *       store intel → localization → optimizer → update recommendations
 * Called by the "Sync All" orchestrator.
 */
export async function runAsoFullSync(
  projectId: string
): Promise<{ error?: string; refreshed: number; analyzed: number }> {
  const supabase = createAdminClient();

  const { data: listings } = await supabase
    .from("app_store_listings")
    .select("id")
    .eq("project_id", projectId);

  if (!listings?.length) return { refreshed: 0, analyzed: 0 };

  let refreshed = 0;
  let analyzed = 0;

  for (const listing of listings) {
    try {
      // 1. Refresh app data from the store (also tracks version changes + snapshots)
      await refreshAppListing(listing.id);
      refreshed++;

      // 1b. Ensure at least one version is tracked (first sync won't detect a "change")
      const { data: existingVersions } = await supabase
        .from("app_store_versions")
        .select("id")
        .eq("listing_id", listing.id)
        .limit(1);

      if (!existingVersions?.length) {
        // Fetch current version from the listing
        const { data: listingData } = await supabase
          .from("app_store_listings")
          .select("current_version")
          .eq("id", listing.id)
          .single();
        if (listingData?.current_version) {
          await trackVersionChange(listing.id, listingData.current_version as string);
        }
      }

      // 2. Check if keywords exist; if not, generate them
      const { data: existingRankings } = await supabase
        .from("app_store_rankings")
        .select("id")
        .eq("listing_id", listing.id)
        .limit(1);

      if (!existingRankings?.length) {
        await generateAppKeywords(listing.id);
      } else {
        // Refresh existing keyword positions
        await refreshKeywordRankings(listing.id);
      }

      // 3. Discover competitors if none tracked
      const { data: existingComps } = await supabase
        .from("app_store_competitors")
        .select("id")
        .eq("listing_id", listing.id)
        .limit(1);

      if (!existingComps?.length) {
        try { await discoverCompetitors(listing.id); } catch { /* optional */ }
      } else {
        try { await refreshCompetitors(listing.id); } catch { /* optional */ }
      }

      // 4. Run ASO analysis
      await analyzeAppListing(listing.id);

      // 5. Extract review topics
      try { await extractReviewTopics(listing.id); } catch { /* optional */ }

      // 6. Record daily snapshot
      await recordSnapshot(listing.id);

      // 7. Localization: analyze markets + auto-translate top 3 non-English markets
      try {
        const locResult = await analyzeLocalizationOpportunity(listing.id);
        if ("success" in locResult && locResult.markets) {
          const topMarkets = locResult.markets
            .filter((m) => m.status === "not_localized" && !m.locale.startsWith("en"))
            .slice(0, 3);
          for (const market of topMarkets) {
            try { await generateTranslation(listing.id, market.code); } catch { /* optional */ }
          }
        }
      } catch { /* optional */ }

      // Note: Store Intel, Optimizer, and Update Recommendations are auto-loaded
      // on tab mount (useEffect) — no need to run them here since they don't persist.

      analyzed++;
    } catch {
      // Continue with next listing
    }
  }

  return { refreshed, analyzed };
}

/**
 * Legacy alias for backwards compatibility.
 */
export const runAsoDeepAnalysis = runAsoFullSync;
