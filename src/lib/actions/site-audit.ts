"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getPageSpeedData } from "@/lib/api/pagespeed";
import { processPageSpeedAudit } from "@/lib/actions/audit-utils";
import { crawlSite, type CrawledPage } from "@/lib/crawl/site-crawler";

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
    // Step 1: Multi-page crawl (discover and analyze up to 25 pages)
    const crawledPages = await crawlSite(domain, { maxPages: 25, timeoutMs: 15000, concurrency: 3 });

    // Step 2: Get PageSpeed CWV for the homepage
    const pageSpeedResult = await getPageSpeedData(targetUrl, "mobile");

    if (pageSpeedResult.error || !pageSpeedResult.data) {
      // Even if PageSpeed fails, we still have crawled pages
      // Create a basic audit from crawled data
      if (crawledPages.length > 0) {
        await finalizeCrawlOnlyAudit(supabase, projectId, audit.id, crawledPages);
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
      return { error: pageSpeedResult.error ?? "Failed to fetch PageSpeed data." };
    }

    // Step 3: Process PageSpeed data into the audit (scores + CWV issues)
    await processPageSpeedAudit(supabase, projectId, pageSpeedResult.data, audit.id, targetUrl);

    // Step 4: Update audit with actual crawl count and insert all crawled pages
    await supabase
      .from("site_audits")
      .update({
        pages_crawled: crawledPages.length,
        pages_total: crawledPages.length,
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
    const crawlIssues = generateCrawlIssues(crawledPages, audit.id);

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

    // Update total issues count (exclude metric & signal entries)
    const { count } = await supabase
      .from("audit_issues")
      .select("id", { count: "exact" })
      .eq("audit_id", audit.id)
      .not("rule_id", "like", "cwv-metric-%")
      .not("rule_id", "like", "page-%-signals");

    if (count != null) {
      await supabase.from("site_audits").update({ issues_found: count }).eq("id", audit.id);
    }
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
  return { success: true };
}

// ================================================================
// Helpers
// ================================================================

function countPageIssues(page: CrawledPage): number {
  let issues = 0;
  if (!page.title) issues++;
  if (!page.metaDescription) issues++;
  if (!page.h1) issues++;
  if (!page.hasSchema) issues++;
  if (!page.hasCanonical) issues++;
  if (page.imagesWithoutAlt > 0) issues++;
  if (page.wordCount < 300) issues++;
  return issues;
}

function generateCrawlIssues(pages: CrawledPage[], auditId: string) {
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
    // Missing title
    if (!page.title) {
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
    if (!page.metaDescription) {
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
    if (!page.h1) {
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

    // Thin content
    if (page.wordCount < 300 && page.statusCode === 200) {
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
    if (!page.hasSchema) {
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
    if (page.imagesWithoutAlt > 0) {
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
    if (!page.hasCanonical) {
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

    // 4xx/5xx status codes
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
  pages: CrawledPage[]
) {
  // Compute basic scores from crawl data
  const pagesOk = pages.filter((p) => p.statusCode === 200);
  const withTitle = pagesOk.filter((p) => p.title).length;
  const withSchema = pagesOk.filter((p) => p.hasSchema).length;
  const withMeta = pagesOk.filter((p) => p.metaDescription).length;
  const total = pagesOk.length || 1;

  const seoScore = Math.round(
    ((withTitle / total) * 30 + (withSchema / total) * 30 + (withMeta / total) * 20 + 20) // base 20
  );
  const healthScore = Math.min(100, seoScore);

  const issues = generateCrawlIssues(pages, auditId);

  await supabase.from("site_audits").update({
    status: "completed",
    pages_crawled: pages.length,
    pages_total: pages.length,
    issues_found: issues.length,
    health_score: healthScore,
    seo_score: seoScore,
    performance_score: 0,
    accessibility_score: 0,
    content_score: Math.round((pagesOk.filter((p) => p.wordCount >= 300).length / total) * 100),
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
