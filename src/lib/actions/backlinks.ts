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
import { dispatchNotification } from "@/lib/notifications/dispatch";

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

  const newCount = newLinks?.length ?? 0;
  const lostCount = lostLinks?.length ?? 0;

  // Dispatch notifications for new/lost backlinks
  if (newCount > 0 || lostCount > 0) {
    try {
      const { data: projOrg } = await supabase
        .from("projects")
        .select("organization_id, name, domain")
        .eq("id", projectId)
        .single();

      if (projOrg?.organization_id) {
        if (newCount > 0) {
          await dispatchNotification(projOrg.organization_id, {
            type: "backlink.new",
            title: `${newCount} New Backlink${newCount > 1 ? "s" : ""} Detected`,
            message: `${newCount} new backlinks found for ${projOrg.domain ?? "your site"} in the last 7 days.`,
            details: { "New Backlinks": newCount },
            projectId,
            projectName: projOrg.name ?? undefined,
            userId: user.id,
            actionUrl: "/dashboard/backlinks",
          });
        }
        if (lostCount > 0) {
          await dispatchNotification(projOrg.organization_id, {
            type: "backlink.lost",
            title: `${lostCount} Backlink${lostCount > 1 ? "s" : ""} Lost`,
            message: `${lostCount} backlinks to ${projOrg.domain ?? "your site"} haven't been seen in 30+ days.`,
            details: { "Lost Backlinks": lostCount },
            projectId,
            projectName: projOrg.name ?? undefined,
            userId: user.id,
            actionUrl: "/dashboard/backlinks",
          });
        }
      }
    } catch (notifErr) {
      console.error("[detectNewLostLinks] Notification error:", notifErr);
    }
  }

  revalidatePath("/dashboard/backlinks");
  return { success: true, newLinks: newCount, lostLinks: lostCount };
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
          // Check if this backlink already exists
          const { data: existing } = await supabase
            .from("backlinks")
            .select("id")
            .eq("project_id", projectId)
            .eq("source_url", link.source_url)
            .eq("target_url", link.target_url)
            .maybeSingle();

          if (existing) {
            // Update last_seen for existing backlink
            await supabase
              .from("backlinks")
              .update({ last_seen: now })
              .eq("id", existing.id);
          } else {
            // Insert genuinely new backlink
            const { error } = await supabase.from("backlinks").insert({
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
            });
            if (!error) discoveredCount++;
          }
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

    // Dispatch notifications for newly discovered backlinks
    if (discoveredCount > 0) {
      try {
        // Get org ID from project
        const { data: projOrg } = await supabase
          .from("projects")
          .select("organization_id, name")
          .eq("id", projectId)
          .single();

        if (projOrg?.organization_id) {
          await dispatchNotification(projOrg.organization_id, {
            type: "backlink.new",
            title: `${discoveredCount} New Backlink${discoveredCount > 1 ? "s" : ""} Discovered`,
            message: `Found ${discoveredCount} new backlinks pointing to ${domain} from ${crawledCount} crawled pages.`,
            details: {
              "New Backlinks": discoveredCount,
              "Pages Crawled": crawledCount,
              Domain: domain,
            },
            projectId,
            projectName: projOrg.name ?? domain,
            userId: user.id,
            actionUrl: "/dashboard/backlinks",
          });
        }
      } catch (notifErr) {
        console.error("[discoverBacklinks] Notification error:", notifErr);
      }
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

// ─── Broken Link Building Opportunities ─────────────────────────────────────

/**
 * Discover broken link building opportunities using AI analysis.
 * Identifies potential broken links on competitor sites that you could
 * offer your content as a replacement for.
 */
export async function discoverBrokenLinkOpportunities(
  projectId: string
): Promise<
  | { error: string }
  | {
      success: true;
      opportunities: Array<{
        sourceDomain: string;
        brokenUrl: string;
        suggestedReplacement: string;
        relevanceScore: number;
        outreachTemplate: string;
      }>;
    }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    // Fetch competitors for the project
    const { data: competitors } = await supabase
      .from("competitors")
      .select("id, name, domain")
      .eq("project_id", projectId);

    if (!competitors || competitors.length === 0) {
      return { error: "No competitors tracked. Add competitors first." };
    }

    // Fetch your existing backlinks to understand your content topics
    const { data: backlinks } = await supabase
      .from("backlinks")
      .select("target_url, anchor_text, source_domain")
      .eq("project_id", projectId)
      .limit(30);

    // Get project domain for context
    const { data: project } = await supabase
      .from("projects")
      .select("domain, name")
      .eq("id", projectId)
      .single();

    if (!project?.domain) return { error: "Project has no domain configured." };

    const competitorList = competitors
      .map((c) => `- ${c.name} (${c.domain})`)
      .join("\n");

    const existingBacklinks = (backlinks ?? [])
      .map((b) => `- ${b.target_url} (anchor: "${b.anchor_text ?? "none"}", from: ${b.source_domain})`)
      .join("\n");

    const prompt = `You are a link building strategist specializing in broken link building. Analyze the following data and identify broken link building opportunities.

**Your domain:** ${project.domain} (${project.name})

**Competitors:**
${competitorList}

**Your existing backlinks (to understand your content topics):**
${existingBacklinks || "No backlinks tracked yet."}

Identify 8-12 potential broken link building opportunities. For each opportunity:
- sourceDomain: A domain that likely has broken outbound links (could be competitor sites, industry blogs, resource pages, etc.)
- brokenUrl: A plausible broken URL on that domain (a page that may have been removed, restructured, or is commonly 404)
- suggestedReplacement: A URL path on "${project.domain}" that could serve as a replacement, or a content piece you should create
- relevanceScore: How relevant this opportunity is (0-100)
- outreachTemplate: A brief, personalized outreach email template (2-3 sentences) to contact the site owner

Focus on:
1. Competitor domains that likely have pages that get removed or restructured
2. Industry resource pages that commonly link to outdated content
3. Common broken link patterns in the niche (tools shutting down, blogs being abandoned, etc.)

Return ONLY valid JSON in this format:
{
  "opportunities": [...]
}`;

    const result = await aiChat(prompt, {
      jsonMode: true,
      maxTokens: 3000,
      temperature: 0.5,
      context: { feature: "broken-link-building" },
    });

    if (!result?.text) return { error: "AI analysis returned no results." };

    const parsed = JSON.parse(result.text);

    revalidatePath("/dashboard/backlinks");
    return {
      success: true,
      opportunities: parsed.opportunities ?? [],
    };
  } catch (err) {
    console.error("[discoverBrokenLinkOpportunities] Error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to discover broken link opportunities.",
    };
  }
}
