"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getPageSpeedData } from "@/lib/api/pagespeed";
import { processPageSpeedAudit } from "@/lib/actions/audit-utils";
import { crawlSite, type CrawledPage, type CrawlResult } from "@/lib/crawl/site-crawler";
import { aiChat } from "@/lib/ai/ai-provider";

/* ==================================================================
   Scheduled Audit Actions
   ================================================================== */

export type AuditFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface ScheduledAudit {
  id: string;
  project_id: string;
  frequency: AuditFrequency;
  next_run_at: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Create or update a scheduled audit for a project.
 * Only one active schedule per project (enforced by DB unique index).
 */
export async function scheduleAudit(
  projectId: string,
  frequency: AuditFrequency
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Calculate next run time
  const nextRun = calculateNextRunFromNow(frequency);

  // Deactivate any existing schedule for this project
  await supabase
    .from("scheduled_audits")
    .update({ is_active: false })
    .eq("project_id", projectId)
    .eq("is_active", true);

  // Insert new schedule
  const { error } = await supabase.from("scheduled_audits").insert({
    project_id: projectId,
    frequency,
    next_run_at: nextRun.toISOString(),
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/site-audit");
  return { success: true };
}

/**
 * Cancel (deactivate) a scheduled audit.
 */
export async function cancelScheduledAudit(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("scheduled_audits")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/site-audit");
  return { success: true };
}

/**
 * Get the active scheduled audit for a project (if any).
 */
export async function getScheduledAudit(
  projectId: string
): Promise<ScheduledAudit | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("scheduled_audits")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .single();

  return data as ScheduledAudit | null;
}

function calculateNextRunFromNow(frequency: AuditFrequency): Date {
  const now = new Date();
  switch (frequency) {
    case "daily":
      now.setDate(now.getDate() + 1);
      break;
    case "weekly":
      now.setDate(now.getDate() + 7);
      break;
    case "biweekly":
      now.setDate(now.getDate() + 14);
      break;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      break;
  }
  now.setHours(3, 0, 0, 0); // 3 AM UTC
  return now;
}

/**
 * Run a new site audit for a project.
 * 1. Crawls multiple pages via sitemap + link discovery
 * 2. Fetches PageSpeed data for the homepage (CWV)
 * 3. Creates audit record with all discovered pages
 */
export async function runSiteAudit(
  projectId: string
): Promise<{ error: string } | { success: true }> {
  // Verify the user is authenticated
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Use admin client for DB operations (bypasses RLS)
  const supabase = createAdminClient();

  // Get the project URL/domain
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, domain, url")
    .eq("id", projectId)
    .single();

  if (projectError || !project) return { error: "Project not found." };

  const targetUrl =
    project.url || (project.domain ? `https://${project.domain}` : null);

  if (!targetUrl) return { error: "Project has no URL or domain configured." };

  const domain = (project.domain ?? project.url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Create the audit record in crawling state
  const { data: audit, error: auditInsertError } = await supabase
    .from("site_audits")
    .insert({
      project_id: projectId,
      status: "crawling",
      pages_crawled: 0,
      issues_found: 0,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (auditInsertError || !audit) {
    return { error: auditInsertError?.message ?? "Failed to create audit record." };
  }

  try {
    // Step 1+2: Run crawl and PageSpeed in PARALLEL to stay within function timeout
    // Wrap crawl in a 45-second hard timeout to avoid indefinite hangs
    const crawlWithTimeout = Promise.race([
      crawlSite(domain, { maxPages: 15, timeoutMs: 10000, concurrency: 3 }),
      new Promise<CrawlResult>((_, reject) =>
        setTimeout(() => reject(new Error("Crawl timeout — exceeded 45 seconds")), 45000)
      ),
    ]).catch((err) => {
      console.error(`[runSiteAudit] Crawl failed/timed out for ${domain}:`, err);
      // Return empty crawl result so audit still completes with PageSpeed data
      return { pages: [] as CrawledPage[], siteIsSPA: false, jsRenderingUsed: false } as CrawlResult;
    });

    const [crawlResult, pageSpeedResult] = await Promise.all([
      crawlWithTimeout,
      getPageSpeedData(targetUrl, "mobile").catch((err) => {
        console.error(`[runSiteAudit] PageSpeed threw for ${targetUrl}:`, err);
        return { data: null, error: `PageSpeed error: ${err instanceof Error ? err.message : String(err)}` } as Awaited<ReturnType<typeof getPageSpeedData>>;
      }),
    ]);

    const crawledPages = crawlResult.pages;
    const siteIsSPA = crawlResult.siteIsSPA;
    const jsRenderingUsed = crawlResult.jsRenderingUsed;

    const pageSpeedFailed = !!(pageSpeedResult.error || !pageSpeedResult.data);
    if (pageSpeedFailed) {
      console.error(`[runSiteAudit] PageSpeed failed for ${targetUrl}: ${pageSpeedResult.error ?? "No data returned"}`);
    }

    // If PageSpeed failed, fall back to crawl-only audit
    if (pageSpeedFailed) {
      if (crawledPages.length > 0) {
        await finalizeCrawlOnlyAudit(supabase, projectId, audit.id, crawledPages, siteIsSPA, jsRenderingUsed);
        revalidatePath("/dashboard/site-audit");
        revalidatePath("/dashboard/search-ai");
        revalidatePath("/dashboard");
        return { success: true };
      }

      await supabase
        .from("site_audits")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", audit.id);

      revalidatePath("/dashboard/site-audit");
      return { error: `Site audit failed: ${domain} is too slow or unreachable. The crawl timed out and PageSpeed could not analyze the site. Verify the domain loads quickly in a browser.` };
    }

    // Step 3: Process PageSpeed data into the audit (scores + CWV issues)
    const psData = pageSpeedResult.data!;
    await processPageSpeedAudit(supabase, projectId, psData, audit.id, targetUrl);

    // Step 4: Update audit with actual crawl count, SPA flag, and insert all crawled pages
    await supabase
      .from("site_audits")
      .update({
        pages_crawled: crawledPages.length,
        pages_total: crawledPages.length,
        is_spa: siteIsSPA,
      })
      .eq("id", audit.id);

    // Step 5: Update homepage audit_pages row with crawler data (processPageSpeedAudit only stores PageSpeed metrics)
    const homepageNorm = targetUrl.replace(/\/$/, "");
    const homepageCrawl = crawledPages.find((p) => {
      const norm = p.url.replace(/\/$/, "");
      return norm === homepageNorm || norm === homepageNorm.replace("www.", "") || norm.replace("www.", "") === homepageNorm;
    });

    if (homepageCrawl) {
      // Update using targetUrl (the URL processPageSpeedAudit stored) since crawler may return a different variant
      const { error: hpUpdateError } = await supabase
        .from("audit_pages")
        .update({
          title: homepageCrawl.title,
          meta_description: homepageCrawl.metaDescription,
          h1: homepageCrawl.h1,
          word_count: homepageCrawl.wordCount,
          has_schema: homepageCrawl.hasSchema,
          canonical_url: homepageCrawl.canonicalUrl,
          issues_count: countPageIssues(homepageCrawl),
        })
        .eq("audit_id", audit.id)
        .ilike("url", `%${domain}%`);

      if (hpUpdateError) {
        console.error("[runSiteAudit] Failed to update homepage crawler data:", hpUpdateError.message);
      }
    }

    // Step 5b: Insert additional crawled pages (homepage already inserted by processPageSpeedAudit)
    const additionalPages = crawledPages.filter((p) => {
      const norm = p.url.replace(/\/$/, "");
      return norm !== homepageNorm && norm !== homepageNorm.replace("www.", "") && norm.replace("www.", "") !== homepageNorm;
    });

    if (additionalPages.length > 0) {
      const pageRows = additionalPages.map((p) => ({
        audit_id: audit.id,
        url: p.url,
        status_code: p.statusCode,
        title: p.title,
        meta_description: p.metaDescription,
        h1: p.h1,
        word_count: p.wordCount,
        load_time_ms: p.loadTimeMs,
        has_schema: p.hasSchema,
        canonical_url: p.canonicalUrl,
        issues_count: countPageIssues(p),
      }));

      await supabase.from("audit_pages").insert(pageRows);
    }

    // Step 6: Generate additional SEO issues from crawled pages
    // If site is SPA and wasn't JS-rendered, skip false-positive issues
    const crawlIssues = generateCrawlIssues(crawledPages, audit.id, siteIsSPA && !jsRenderingUsed);

    // Step 7: Generate AEO/GEO signal entries (stored as audit_issues for retrieval)
    const signalIssues = generatePageSignals(crawledPages, audit.id);

    // Insert SEO issues and AEO/GEO signals separately so one failure doesn't block the other
    if (crawlIssues.length > 0) {
      await supabase.from("audit_issues").insert(crawlIssues);
    }
    if (signalIssues.length > 0) {
      const { error: signalError } = await supabase.from("audit_issues").insert(signalIssues);
      if (signalError) {
        console.error("Failed to insert AEO/GEO signals:", signalError.message);
      }
    }

    // Recalculate scores from actual crawl data (overrides heuristic scores from processPageSpeedAudit)
    const { seoScore, contentScore, healthScore } = computeScoresFromCrawl(
      crawledPages,
      psData.performance_score,
      psData.accessibility_score
    );

    // Update total issues count (exclude metric & signal entries) and crawl-based scores
    const { count } = await supabase
      .from("audit_issues")
      .select("id", { count: "exact" })
      .eq("audit_id", audit.id)
      .not("rule_id", "like", "cwv-metric-%")
      .not("rule_id", "like", "page-%-signals");

    await supabase.from("site_audits").update({
      issues_found: count ?? 0,
      seo_score: seoScore,
      content_score: contentScore,
      health_score: healthScore,
    }).eq("id", audit.id);
  } catch (err) {
    await supabase
      .from("site_audits")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", audit.id);

    revalidatePath("/dashboard/site-audit");
    return { error: err instanceof Error ? err.message : "Audit processing failed." };
  }

  revalidatePath("/dashboard/site-audit");
  revalidatePath("/dashboard/search-ai");
  revalidatePath("/dashboard");

  // Push notification: audit complete
  try {
    const { sendPushToUser } = await import("@/lib/notifications/push");
    await sendPushToUser(user.id, {
      title: "Site Audit Complete",
      message: `Audit for ${project.domain ?? "your site"} finished successfully.`,
      type: "audit.completed",
      actionUrl: "/dashboard/site-audit",
    });
  } catch { /* push is best-effort */ }

  return { success: true };
}

// ================================================================
// Scoring
// ================================================================

/**
 * Compute SEO, Content, and Health scores from actual crawl data.
 * These scores reflect real on-page SEO quality, not heuristics.
 */
function computeScoresFromCrawl(
  pages: CrawledPage[],
  performanceScore: number | null,
  accessibilityScore: number | null
): { seoScore: number; contentScore: number; healthScore: number } {
  const ok = pages.filter((p) => p.statusCode === 200);
  const total = ok.length || 1;

  // SEO score components (each 0-100, weighted)
  const withTitle = ok.filter((p) => p.title).length;
  const withMeta = ok.filter((p) => p.metaDescription).length;
  const withH1 = ok.filter((p) => p.h1).length;
  const withCanonical = ok.filter((p) => p.hasCanonical).length;
  const withSchema = ok.filter((p) => p.hasSchema).length;
  const noErrors = pages.filter((p) => p.statusCode < 400).length;
  const errorPenalty = pages.length > 0 ? (noErrors / pages.length) : 1;

  const seoScore = Math.round(
    (withTitle / total) * 25 +       // 25% weight: title tags
    (withMeta / total) * 20 +        // 20% weight: meta descriptions
    (withH1 / total) * 15 +          // 15% weight: H1 headings
    (withCanonical / total) * 15 +   // 15% weight: canonical URLs
    (withSchema / total) * 15 +      // 15% weight: structured data
    errorPenalty * 10                // 10% weight: no HTTP errors
  );

  // Content score: based on word count adequacy
  // Exclude non-content pages (legal, utility) from thin content penalty
  const contentPages = ok.filter((p) => !isNonContentPage(p.url));
  const contentTotal = contentPages.length || 1;
  const withAdequateContent = contentPages.filter((p) => p.wordCount >= 300).length;
  const avgWordCount = contentPages.reduce((sum, p) => sum + p.wordCount, 0) / contentTotal;
  const wordCountBonus = Math.min(1, avgWordCount / 500); // bonus for avg 500+ words
  const contentScore = Math.round(
    (withAdequateContent / contentTotal) * 80 + // 80% weight: content pages with 300+ words
    wordCountBonus * 20                         // 20% weight: average word count depth
  );

  // Health score: weighted average of all available scores
  const perf = performanceScore ?? 0;
  const access = accessibilityScore ?? 0;
  const hasPageSpeed = performanceScore != null;

  const healthScore = hasPageSpeed
    ? Math.round(seoScore * 0.3 + perf * 0.25 + access * 0.15 + contentScore * 0.3)
    : Math.round(seoScore * 0.5 + contentScore * 0.5);

  return { seoScore, contentScore, healthScore };
}

// ================================================================
// Helpers
// ================================================================

// URL patterns for pages where thin content is expected and NOT an SEO issue.
// These pages serve legal, utility, or functional purposes — word count is irrelevant.
const NON_CONTENT_URL_PATTERNS = [
  /\/(terms|tos|terms-of-service|terms-and-conditions)(\/|$)/i,
  /\/(privacy|privacy-policy)(\/|$)/i,
  /\/(cookie|cookies|cookie-policy)(\/|$)/i,
  /\/(legal|disclaimer|dmca|gdpr|compliance)(\/|$)/i,
  /\/(contact|contact-us)(\/|$)/i,
  /\/(login|signin|sign-in|signup|sign-up|register|auth)(\/|$)/i,
  /\/(forgot-password|reset-password|verify|confirm|callback)(\/|$)/i,
  /\/(sitemap|robots)(\/|$)/i,
  /\/(404|500|error)(\/|$)/i,
  /\/(unsubscribe|opt-out|preferences)(\/|$)/i,
];

/**
 * Check if a URL is a non-content page (legal, utility, auth) where
 * thin content should NOT be flagged as an SEO issue.
 */
function isNonContentPage(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return NON_CONTENT_URL_PATTERNS.some(pattern => pattern.test(pathname));
  } catch {
    return false;
  }
}

function countPageIssues(page: CrawledPage): number {
  let issues = 0;
  if (!page.title) issues++;
  if (!page.metaDescription) issues++;
  if (!page.h1) issues++;
  if (!page.hasSchema) issues++;
  if (!page.hasCanonical) issues++;
  if (page.imagesWithoutAlt > 0) issues++;
  if (page.wordCount < 300 && !isNonContentPage(page.url)) issues++;
  return issues;
}

function generateCrawlIssues(pages: CrawledPage[], auditId: string, skipSpaFalsePositives: boolean = false) {
  // Rules that are known false positives on JS-rendered sites where
  // the crawler couldn't execute JavaScript (no ScrapingBee).
  // These elements exist in the DOM after JS renders but are invisible to the HTML crawler.
  const SPA_FALSE_POSITIVE_RULES = new Set([
    "missing-title",
    "missing-meta-description",
    "missing-h1",
    "thin-content",
    "missing-schema",
    "missing-canonical",
    "missing-alt-text",
  ]);

  const issues: Array<{
    audit_id: string;
    category: string;
    severity: string;
    rule_id: string;
    title: string;
    description: string;
    affected_url: string | null;
    recommendation: string;
  }> = [];

  for (const page of pages) {
    // Suppress false positives for SPA pages whose content can't be crawled.
    // This includes: (a) unrendered SPA pages (no JS renderer available), and
    // (b) pages that were JS-rendered but are still thin — meaning the content
    // is loaded dynamically from APIs and can't be captured by any crawler.
    const isUnrenderedSpaPage =
      (skipSpaFalsePositives && !page.jsRendered) ||
      (page.detectedAsSPA && page.jsRendered && page.wordCount < 300);

    // Missing title
    if (!page.title && !(isUnrenderedSpaPage && SPA_FALSE_POSITIVE_RULES.has("missing-title"))) {
      issues.push({
        audit_id: auditId,
        category: "seo",
        severity: "critical",
        rule_id: "missing-title",
        title: "Page missing title tag",
        description: `${page.url} has no <title> tag.`,
        affected_url: page.url,
        recommendation: "Add a unique, descriptive title tag (50-60 characters).",
      });
    }

    // Missing meta description
    if (!page.metaDescription && !(isUnrenderedSpaPage && SPA_FALSE_POSITIVE_RULES.has("missing-meta-description"))) {
      issues.push({
        audit_id: auditId,
        category: "seo",
        severity: "warning",
        rule_id: "missing-meta-description",
        title: "Page missing meta description",
        description: `${page.url} has no meta description.`,
        affected_url: page.url,
        recommendation: "Add a compelling meta description (150-160 characters).",
      });
    }

    // Missing H1
    if (!page.h1 && !(isUnrenderedSpaPage && SPA_FALSE_POSITIVE_RULES.has("missing-h1"))) {
      issues.push({
        audit_id: auditId,
        category: "seo",
        severity: "warning",
        rule_id: "missing-h1",
        title: "Page missing H1 heading",
        description: `${page.url} has no H1 heading.`,
        affected_url: page.url,
        recommendation: "Add a single, descriptive H1 heading that includes your target keyword.",
      });
    }

    // Thin content — skip for legal/utility pages (terms, privacy, contact, etc.)
    // where low word count is expected and not an SEO concern
    if (
      page.wordCount < 300 &&
      page.statusCode === 200 &&
      !isNonContentPage(page.url) &&
      !(isUnrenderedSpaPage && SPA_FALSE_POSITIVE_RULES.has("thin-content"))
    ) {
      issues.push({
        audit_id: auditId,
        category: "content",
        severity: "warning",
        rule_id: "thin-content",
        title: "Thin content detected",
        description: `${page.url} has only ${page.wordCount} words. Pages with thin content rank poorly.`,
        affected_url: page.url,
        recommendation: "Expand content to at least 300 words with valuable, unique information.",
      });
    }

    // Missing schema
    if (!page.hasSchema && !(isUnrenderedSpaPage && SPA_FALSE_POSITIVE_RULES.has("missing-schema"))) {
      issues.push({
        audit_id: auditId,
        category: "seo",
        severity: "info",
        rule_id: "missing-schema",
        title: "No structured data (JSON-LD)",
        description: `${page.url} has no structured data markup.`,
        affected_url: page.url,
        recommendation: "Add JSON-LD structured data (Article, FAQPage, Organization, etc.).",
      });
    }

    // Images without alt text
    if (page.imagesWithoutAlt > 0 && !(isUnrenderedSpaPage && SPA_FALSE_POSITIVE_RULES.has("missing-alt-text"))) {
      issues.push({
        audit_id: auditId,
        category: "accessibility",
        severity: "warning",
        rule_id: "missing-alt-text",
        title: `${page.imagesWithoutAlt} image${page.imagesWithoutAlt > 1 ? "s" : ""} missing alt text`,
        description: `${page.url} has ${page.imagesWithoutAlt} of ${page.imageCount} images without alt attributes.`,
        affected_url: page.url,
        recommendation: "Add descriptive alt text to all images for accessibility and SEO.",
      });
    }

    // Missing canonical
    if (!page.hasCanonical && !(isUnrenderedSpaPage && SPA_FALSE_POSITIVE_RULES.has("missing-canonical"))) {
      issues.push({
        audit_id: auditId,
        category: "seo",
        severity: "info",
        rule_id: "missing-canonical",
        title: "No canonical URL specified",
        description: `${page.url} has no canonical link tag.`,
        affected_url: page.url,
        recommendation: "Add a canonical URL to prevent duplicate content issues.",
      });
    }

    // 4xx/5xx status codes — always report these, never a false positive
    if (page.statusCode >= 400) {
      issues.push({
        audit_id: auditId,
        category: "seo",
        severity: page.statusCode >= 500 ? "critical" : "warning",
        rule_id: `http-error-${page.statusCode}`,
        title: `HTTP ${page.statusCode} error`,
        description: `${page.url} returned status ${page.statusCode}.`,
        affected_url: page.url,
        recommendation: page.statusCode === 404
          ? "Fix or redirect this broken page."
          : "Investigate and resolve the server error.",
      });
    }
  }

  // Site-wide issues
  const pagesWithSchema = pages.filter((p) => p.hasSchema).length;
  const schemaCoverage = pages.length > 0 ? (pagesWithSchema / pages.length) * 100 : 0;
  if (schemaCoverage < 30 && pages.length >= 3) {
    issues.push({
      audit_id: auditId,
      category: "seo",
      severity: "warning",
      rule_id: "low-schema-coverage",
      title: `Low structured data coverage (${Math.round(schemaCoverage)}%)`,
      description: `Only ${pagesWithSchema} of ${pages.length} crawled pages have structured data markup.`,
      affected_url: null,
      recommendation: "Add JSON-LD structured data to more pages to improve rich snippet eligibility.",
    });
  }

  const pagesWithOg = pages.filter((p) => p.hasOgTags).length;
  const ogCoverage = pages.length > 0 ? (pagesWithOg / pages.length) * 100 : 0;
  if (ogCoverage < 50 && pages.length >= 3) {
    issues.push({
      audit_id: auditId,
      category: "seo",
      severity: "info",
      rule_id: "low-og-coverage",
      title: `Low Open Graph coverage (${Math.round(ogCoverage)}%)`,
      description: `Only ${pagesWithOg} of ${pages.length} crawled pages have OG tags for social sharing.`,
      affected_url: null,
      recommendation: "Add Open Graph meta tags (og:title, og:description, og:image) to all pages.",
    });
  }

  return issues;
}

/**
 * Fallback: create audit from crawled data only (no PageSpeed).
 */
async function finalizeCrawlOnlyAudit(
  supabase: ReturnType<typeof createAdminClient>,
  projectId: string,
  auditId: string,
  pages: CrawledPage[],
  siteIsSPA: boolean = false,
  jsRenderingUsed: boolean = false
) {
  const skipFalsePositives = siteIsSPA && !jsRenderingUsed;
  const issues = generateCrawlIssues(pages, auditId, skipFalsePositives);

  // Compute scores from actual crawl data (no PageSpeed available)
  const { seoScore, contentScore, healthScore } = computeScoresFromCrawl(pages, null, null);

  await supabase.from("site_audits").update({
    status: "completed",
    pages_crawled: pages.length,
    pages_total: pages.length,
    issues_found: issues.length,
    health_score: healthScore,
    seo_score: seoScore,
    // Store null instead of 0 when PageSpeed wasn't available — UI shows "N/A"
    performance_score: null,
    accessibility_score: null,
    content_score: contentScore,
    is_spa: siteIsSPA,
    completed_at: new Date().toISOString(),
  }).eq("id", auditId);

  // Insert pages
  const pageRows = pages.map((p) => ({
    audit_id: auditId,
    url: p.url,
    status_code: p.statusCode,
    title: p.title,
    meta_description: p.metaDescription,
    h1: p.h1,
    word_count: p.wordCount,
    load_time_ms: p.loadTimeMs,
    has_schema: p.hasSchema,
    canonical_url: p.canonicalUrl,
    issues_count: countPageIssues(p),
  }));
  await supabase.from("audit_pages").insert(pageRows);

  // Insert SEO issues and AEO/GEO signals separately
  if (issues.length > 0) {
    await supabase.from("audit_issues").insert(issues);
  }
  const signalIssues = generatePageSignals(pages, auditId);
  if (signalIssues.length > 0) {
    const { error: signalError } = await supabase.from("audit_issues").insert(signalIssues);
    if (signalError) {
      console.error("Failed to insert AEO/GEO signals:", signalError.message);
    }
  }
}

/**
 * Generate per-page AEO and GEO signal entries stored as audit_issues.
 * These are retrieved by the search-ai page to power radar charts and per-page breakdowns.
 */
function generatePageSignals(pages: CrawledPage[], auditId: string) {
  const signals: Array<{
    audit_id: string;
    category: string;
    severity: string;
    rule_id: string;
    title: string;
    description: string;
    affected_url: string | null;
    recommendation: string;
  }> = [];

  for (const page of pages) {
    if (page.statusCode !== 200) continue;

    // AEO signals per page
    signals.push({
      audit_id: auditId,
      category: "aeo-signal",
      severity: "info",
      rule_id: "page-aeo-signals",
      title: `AEO: ${page.title || page.url}`,
      description: JSON.stringify({
        hasFaqSchema: page.hasFaqSchema,
        hasHowToSchema: page.hasHowToSchema,
        hasSpeakableSchema: page.hasSpeakableSchema,
        questionCount: page.questionCount,
        listCount: page.listCount,
        schemaTypes: page.schemaTypes,
        schemaRichness: page.schemaTypes.length,
        h2Count: page.h2Count,
        h3Count: page.h3Count,
      }),
      affected_url: page.url,
      recommendation: "",
    });

    // GEO signals per page
    signals.push({
      audit_id: auditId,
      category: "geo-signal",
      severity: "info",
      rule_id: "page-geo-signals",
      title: `GEO: ${page.title || page.url}`,
      description: JSON.stringify({
        hasSchema: page.hasSchema,
        schemaTypes: page.schemaTypes,
        hasOgTags: page.hasOgTags,
        hasBreadcrumbs: page.hasBreadcrumbs,
        hasCanonical: page.hasCanonical,
        hasArticleSchema: page.hasArticleSchema,
        hasOrganizationSchema: page.hasOrganizationSchema,
        lang: page.lang,
        wordCount: page.wordCount,
        internalLinks: page.internalLinks,
        externalLinks: page.externalLinks,
      }),
      affected_url: page.url,
      recommendation: "",
    });
  }

  return signals;
}

// ─── Batch URL Analysis ─────────────────────────────────────────────────────

/**
 * Batch analyze a list of URLs for SEO health.
 * Performs lightweight fetches to check status code, response time, title tag,
 * then uses AI to provide SEO insights across all results.
 */
export async function batchAnalyzeUrls(
  projectId: string,
  urls: string[]
): Promise<
  | { error: string }
  | {
      success: true;
      results: Array<{
        url: string;
        statusCode: number | null;
        responseTime: number | null;
        title: string | null;
        seoScore: number;
        issues: string[];
      }>;
      summary: string;
    }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Validate URLs
  if (!urls || urls.length === 0) return { error: "No URLs provided." };
  if (urls.length > 20) return { error: "Maximum 20 URLs allowed per batch." };

  const validUrls: string[] = [];
  for (const url of urls) {
    try {
      new URL(url);
      validUrls.push(url);
    } catch {
      return { error: `Invalid URL: ${url}` };
    }
  }

  try {
    // Fetch each URL to get basic info
    const fetchResults = await Promise.allSettled(
      validUrls.map(async (url) => {
        const startTime = Date.now();
        try {
          const response = await fetch(url, {
            method: "GET",
            redirect: "follow",
            signal: AbortSignal.timeout(10000),
            headers: {
              "User-Agent": "RankPulse-SEO-Audit/1.0",
            },
          });
          const responseTime = Date.now() - startTime;
          const html = await response.text();

          // Extract title tag
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : null;

          // Extract meta description
          const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
          const metaDescription = metaMatch ? metaMatch[1].trim() : null;

          // Check for H1
          const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const hasH1 = !!h1Match;

          // Check content type
          const contentType = response.headers.get("content-type") ?? "";

          return {
            url,
            statusCode: response.status,
            responseTime,
            title,
            metaDescription,
            hasH1,
            contentType,
          };
        } catch (err) {
          return {
            url,
            statusCode: null,
            responseTime: Date.now() - startTime,
            title: null,
            metaDescription: null,
            hasH1: false,
            contentType: "",
            error: err instanceof Error ? err.message : "Fetch failed",
          };
        }
      })
    );

    // Process results
    const pageData = fetchResults.map((result) => {
      if (result.status === "fulfilled") return result.value;
      return {
        url: "unknown",
        statusCode: null,
        responseTime: null,
        title: null,
        metaDescription: null,
        hasH1: false,
        contentType: "",
        error: "Fetch failed",
      };
    });

    // Build summary for AI analysis
    const pageSummaries = pageData
      .map(
        (p, i) =>
          `${i + 1}. ${p.url} — Status: ${p.statusCode ?? "ERROR"}, Time: ${p.responseTime ?? "N/A"}ms, Title: "${p.title ?? "MISSING"}", Meta: "${p.metaDescription ? "present" : "MISSING"}", H1: ${p.hasH1 ? "present" : "MISSING"}`
      )
      .join("\n");

    const prompt = `You are an SEO technical auditor. Analyze these ${pageData.length} URLs and provide SEO insights for each.

**URL Results:**
${pageSummaries}

For each URL, provide:
- seoScore: An overall SEO health score (0-100) based on status code, response time, title, meta, H1
- issues: An array of specific SEO issues found (e.g., "Missing title tag", "Slow response time (>3s)", "Missing meta description", "HTTP error 404")

Also provide a "summary" with 2-3 sentences summarizing the overall batch health and key recommendations.

Return ONLY valid JSON in this format:
{
  "results": [
    {"index": 1, "seoScore": 85, "issues": ["Missing meta description"]},
    ...
  ],
  "summary": "..."
}`;

    const aiResult = await aiChat(prompt, {
      jsonMode: true,
      maxTokens: 2000,
      temperature: 0.3,
      context: { feature: "batch-url-analysis" },
    });

    let aiScores: Array<{ index: number; seoScore: number; issues: string[] }> = [];
    let aiSummary = "";

    if (aiResult?.text) {
      try {
        const parsed = JSON.parse(aiResult.text);
        aiScores = parsed.results ?? [];
        aiSummary = parsed.summary ?? "";
      } catch {
        // AI response parse failed — use fallback scores
      }
    }

    // Merge fetch results with AI scores
    const results = pageData.map((p, i) => {
      const aiScore = aiScores.find((s) => s.index === i + 1);

      // Fallback scoring if AI didn't respond
      let seoScore = aiScore?.seoScore ?? 50;
      let issues = aiScore?.issues ?? [];

      if (!aiScore) {
        // Basic heuristic fallback
        issues = [];
        seoScore = 100;

        if (!p.statusCode || p.statusCode >= 400) {
          seoScore -= 40;
          issues.push(`HTTP error ${p.statusCode ?? "unreachable"}`);
        }
        if (!p.title) {
          seoScore -= 20;
          issues.push("Missing title tag");
        }
        if (!p.metaDescription) {
          seoScore -= 15;
          issues.push("Missing meta description");
        }
        if (!p.hasH1) {
          seoScore -= 10;
          issues.push("Missing H1 heading");
        }
        if (p.responseTime && p.responseTime > 3000) {
          seoScore -= 15;
          issues.push(`Slow response time (${(p.responseTime / 1000).toFixed(1)}s)`);
        }

        seoScore = Math.max(0, seoScore);
      }

      return {
        url: p.url,
        statusCode: p.statusCode,
        responseTime: p.responseTime,
        title: p.title,
        seoScore,
        issues,
      };
    });

    const summary =
      aiSummary ||
      `Analyzed ${results.length} URLs. ${results.filter((r) => r.seoScore >= 70).length} pages are healthy, ${results.filter((r) => r.seoScore < 50).length} need attention.`;

    revalidatePath("/dashboard/site-audit");
    return { success: true, results, summary };
  } catch (err) {
    console.error("[batchAnalyzeUrls] Error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to analyze URLs.",
    };
  }
}
