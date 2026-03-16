"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  crawlPageForBacklinks,
  searchForBacklinks,
  getCommonSourceUrls,
  aiDiscoverBacklinkSources,
} from "@/lib/backlinks/crawler";
import { fetchSiteContext } from "@/lib/ai/fetch-site-context";
import { aiChat } from "@/lib/ai/ai-provider";

/**
 * Disavow a toxic backlink by marking it as disavowed.
 */
export async function disavowBacklink(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("backlinks")
    .update({ is_toxic: true, status: "lost" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/backlinks");
  return { success: true };
}

/**
 * Flag a lost backlink for reclaim outreach.
 */
export async function reclaimBacklink(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("backlinks")
    .update({ status: "new" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/backlinks");
  return { success: true };
}

/**
 * Run toxic link detection on all backlinks for a project.
 * Uses heuristic scoring based on domain characteristics.
 */
export async function detectToxicLinks(
  projectId: string
): Promise<{ error: string } | { success: true; toxic: number; total: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: links } = await supabase
    .from("backlinks")
    .select("id, source_url, source_domain, anchor_text, domain_authority, link_type")
    .eq("project_id", projectId);

  if (!links || links.length === 0) return { error: "No backlinks to analyze." };

  let toxicCount = 0;

  for (const link of links) {
    const toxicScore = calculateToxicScore(link);
    const isToxic = toxicScore >= 60;

    if (isToxic) toxicCount++;

    await supabase
      .from("backlinks")
      .update({
        toxic_score: toxicScore,
        is_toxic: isToxic,
      })
      .eq("id", link.id);
  }

  revalidatePath("/dashboard/backlinks");
  return { success: true, toxic: toxicCount, total: links.length };
}

/**
 * Detect new and lost backlinks by comparing last_seen timestamps.
 */
export async function detectNewLostLinks(
  projectId: string
): Promise<{ error: string } | { success: true; newLinks: number; lostLinks: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Mark links first seen in last 7 days as "new"
  const { data: newLinks } = await supabase
    .from("backlinks")
    .update({ status: "new" })
    .eq("project_id", projectId)
    .gte("first_seen", sevenDaysAgo.toISOString())
    .neq("status", "new")
    .select("id");

  // Mark links last seen > 30 days ago as "lost"
  const { data: lostLinks } = await supabase
    .from("backlinks")
    .update({ status: "lost" })
    .eq("project_id", projectId)
    .lt("last_seen", thirtyDaysAgo.toISOString())
    .neq("status", "lost")
    .select("id");

  revalidatePath("/dashboard/backlinks");
  return {
    success: true,
    newLinks: newLinks?.length ?? 0,
    lostLinks: lostLinks?.length ?? 0,
  };
}

// ─── Toxic Score Calculation ──────────────────────────────────────────────

const SPAM_TLD_PATTERNS = [
  ".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq",
  ".buzz", ".wang", ".click", ".loan", ".bid",
];

const SPAM_KEYWORDS = [
  "casino", "poker", "gambling", "payday", "loan", "pharma",
  "viagra", "cialis", "porn", "adult", "xxx", "cheap-",
  "buy-cheap", "free-download",
];

function calculateToxicScore(link: {
  source_url: string;
  source_domain: string;
  anchor_text: string | null;
  domain_authority: number | null;
  link_type: string | null;
}): number {
  let score = 0;

  // Low DA is suspicious
  if (link.domain_authority !== null) {
    if (link.domain_authority < 5) score += 30;
    else if (link.domain_authority < 15) score += 15;
    else if (link.domain_authority < 30) score += 5;
  } else {
    score += 20; // unknown DA is suspicious
  }

  // Spam TLDs
  const domain = link.source_domain.toLowerCase();
  if (SPAM_TLD_PATTERNS.some((tld) => domain.endsWith(tld))) {
    score += 25;
  }

  // Spam keywords in URL or domain
  const urlLower = link.source_url.toLowerCase();
  const spamKeywordMatches = SPAM_KEYWORDS.filter(
    (kw) => urlLower.includes(kw) || domain.includes(kw)
  );
  score += spamKeywordMatches.length * 15;

  // Exact-match anchor text that looks spammy
  if (link.anchor_text) {
    const anchor = link.anchor_text.toLowerCase();
    const spamAnchorMatches = SPAM_KEYWORDS.filter((kw) => anchor.includes(kw));
    score += spamAnchorMatches.length * 10;
  }

  // Very long URLs are suspicious
  if (link.source_url.length > 200) score += 10;

  return Math.min(100, score);
}

// ─── Self-Contained Backlink Discovery ──────────────────────────────────────

/**
 * Discover backlinks for a project using our own crawling system.
 * No Majestic/Moz dependency — fully self-contained.
 *
 * Strategy:
 * 1. Gather candidate URLs from common sources, AI suggestions, and search
 * 2. Crawl each candidate page for links pointing to our domain
 * 3. Score and store discovered backlinks
 */
export async function discoverBacklinks(
  projectId: string
): Promise<{ error: string } | { success: true; discovered: number; crawled: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Get project domain
  const { data: project } = await supabase
    .from("projects")
    .select("domain")
    .eq("id", projectId)
    .single();

  if (!project?.domain) return { error: "Project has no domain configured." };

  const domain = project.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  try {
    // Fetch site context for AI-powered discovery
    const siteContext = await fetchSiteContext(domain);

    // Phase 1: Gather candidate URLs to crawl
    const candidateUrls = new Set<string>();

    // 1a. Common web directories and platforms
    const commonUrls = getCommonSourceUrls(domain);
    for (const url of commonUrls) candidateUrls.add(url);

    // 1b. AI-powered discovery (finds industry-specific sources)
    const aiUrls = await aiDiscoverBacklinkSources(
      domain,
      siteContext.industry,
      aiChat
    );
    for (const url of aiUrls) candidateUrls.add(url);

    // 1c. Search-based discovery (if Google Custom Search API is configured)
    const { data: searchConfig } = await supabase
      .from("platform_api_configs")
      .select("api_key, config")
      .eq("provider", "google_search")
      .eq("is_active", true)
      .single();

    if (searchConfig?.api_key) {
      const searchEngineId = (searchConfig.config as Record<string, string>)?.search_engine_id;
      const searchUrls = await searchForBacklinks(
        domain,
        searchConfig.api_key,
        searchEngineId
      );
      for (const url of searchUrls) candidateUrls.add(url);
    }

    // 1d. Check existing content pages for mentions from other sites
    const { data: contentPages } = await supabase
      .from("content_pages")
      .select("url")
      .eq("project_id", projectId)
      .limit(10);

    // Phase 2: Crawl each candidate URL
    let crawledCount = 0;
    let discoveredCount = 0;
    const maxCrawl = 30; // Limit to avoid long-running operations
    const now = new Date().toISOString();

    const urlArray = Array.from(candidateUrls).slice(0, maxCrawl);

    // Crawl in batches of 5 for performance
    for (let i = 0; i < urlArray.length; i += 5) {
      const batch = urlArray.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map((url) => crawlPageForBacklinks(url, domain))
      );

      for (const result of results) {
        crawledCount++;
        if (result.status !== "fulfilled") continue;

        const { links } = result.value;
        for (const link of links) {
          // Upsert into backlinks table
          const { error } = await supabase.from("backlinks").upsert(
            {
              project_id: projectId,
              source_url: link.source_url,
              source_domain: link.source_domain,
              target_url: link.target_url,
              anchor_text: link.anchor_text,
              link_type: link.link_type,
              domain_authority: link.domain_authority,
              trust_flow: link.trust_flow,
              citation_flow: link.citation_flow,
              is_toxic: false,
              status: "new",
              first_seen: now,
              last_seen: now,
            },
            { onConflict: "project_id,source_url,target_url" }
          );
          if (!error) discoveredCount++;
        }
      }
    }

    // Phase 3: Create a snapshot
    if (discoveredCount > 0) {
      const { count: totalBacklinks } = await supabase
        .from("backlinks")
        .select("id", { count: "exact" })
        .eq("project_id", projectId);

      const { data: allLinks } = await supabase
        .from("backlinks")
        .select("source_domain, domain_authority")
        .eq("project_id", projectId);

      const uniqueDomains = new Set((allLinks ?? []).map((l) => l.source_domain));
      const avgDA = allLinks && allLinks.length > 0
        ? Math.round(
            allLinks.reduce((sum, l) => sum + (l.domain_authority ?? 0), 0) /
              allLinks.length
          )
        : null;

      await supabase.from("backlink_snapshots").insert({
        project_id: projectId,
        total_backlinks: totalBacklinks ?? 0,
        referring_domains: uniqueDomains.size,
        new_backlinks: discoveredCount,
        lost_backlinks: 0,
        avg_domain_authority: avgDA,
        snapshot_date: now,
      });
    }

    revalidatePath("/dashboard/backlinks");
    return { success: true, discovered: discoveredCount, crawled: crawledCount };
  } catch (err) {
    console.error("[discoverBacklinks] Error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to discover backlinks.",
    };
  }
}

/**
 * Manually add a backlink URL to crawl and verify.
 */
export async function addBacklinkFromUrl(
  projectId: string,
  sourceUrl: string
): Promise<{ error: string } | { success: true; found: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("domain")
    .eq("id", projectId)
    .single();

  if (!project?.domain) return { error: "Project has no domain." };

  const domain = project.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  try {
    const { links } = await crawlPageForBacklinks(sourceUrl, domain);

    if (links.length === 0) {
      return { error: "No links to your domain found on that page." };
    }

    const now = new Date().toISOString();
    let found = 0;

    for (const link of links) {
      const { error } = await supabase.from("backlinks").upsert(
        {
          project_id: projectId,
          source_url: link.source_url,
          source_domain: link.source_domain,
          target_url: link.target_url,
          anchor_text: link.anchor_text,
          link_type: link.link_type,
          domain_authority: link.domain_authority,
          trust_flow: link.trust_flow,
          citation_flow: link.citation_flow,
          is_toxic: false,
          status: "new",
          first_seen: now,
          last_seen: now,
        },
        { onConflict: "project_id,source_url,target_url" }
      );
      if (!error) found++;
    }

    revalidatePath("/dashboard/backlinks");
    return { success: true, found };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to crawl URL.",
    };
  }
}
