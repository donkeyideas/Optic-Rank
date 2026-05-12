"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "@/lib/ai/ai-provider";
import {
  getPageKeywords,
  getPageBacklinks,
  getPageAuditIssues,
  getAllProjectKeywords,
} from "@/lib/dal/website-optimizer";

/* ── Types ──────────────────────────────────────────────────── */

export type WebOptimizationGoal =
  | "balanced"
  | "visibility"
  | "content_quality"
  | "conversion"
  | "technical"
  | "competitive";

/* ── Goal Directives ─────────────────────────────────────────── */

function getWebGoalDirective(goal: WebOptimizationGoal): string {
  switch (goal) {
    case "visibility":
      return `OPTIMIZATION PRIORITY: VISIBILITY & RANKINGS
Your #1 objective is to maximize organic search visibility for tracked keywords.
- Prioritize near-miss keywords (positions 4-10) — pushing these to top 3 gives the largest traffic jump
- Pack title tag and H1 with the highest-volume keywords that fit naturally
- Ensure primary keywords appear in title, H1, meta description, and early in the body content
- Target keywords where even a small ranking improvement yields large volume capture
- Position improvement is more important than compelling copy — optimize for the algorithm first`;

    case "content_quality":
      return `OPTIMIZATION PRIORITY: CONTENT QUALITY & E-E-A-T
Your #1 objective is to improve content depth, readability, and topical authority.
- Recommend expanding thin content to cover subtopics competitors address
- Suggest adding expert quotes, data, statistics, and original research
- Improve readability: short paragraphs, clear headings, scannable structure
- Add structured data and schema markup recommendations
- Recommend internal links to related authoritative content on the site
- Focus on demonstrating Experience, Expertise, Authoritativeness, and Trustworthiness`;

    case "conversion":
      return `OPTIMIZATION PRIORITY: CONVERSION & CTR
Your #1 objective is to maximize click-through rate from SERPs and on-page conversions.
- Write title tags and meta descriptions that stand out in search results
- Use power words, numbers, and emotional triggers that drive clicks
- Ensure the page delivers on the promise made in the SERP snippet
- Include clear calls-to-action and benefit-focused copy
- Address user intent immediately — answer the query in the first paragraph
- Keywords matter less here — persuasive, click-worthy copy matters most`;

    case "technical":
      return `OPTIMIZATION PRIORITY: TECHNICAL SEO
Your #1 objective is to fix technical issues that block ranking potential.
- Focus on Core Web Vitals improvements (LCP, CLS, INP)
- Recommend structured data / schema markup additions
- Address crawlability and indexability issues
- Fix duplicate content, canonical, and redirect issues
- Optimize page speed and resource loading
- Ensure mobile-friendliness and responsive design`;

    case "competitive":
      return `OPTIMIZATION PRIORITY: COMPETITIVE DIFFERENTIATION
Your #1 objective is to outrank competitors by differentiating your page content and positioning.
- Analyze what competitor pages cover and find gaps to exploit
- Target keywords competitors rank poorly for — find coverage gaps
- Recommend unique angles, data, or perspectives competitors lack
- Differentiate title tags and meta descriptions from competitor SERP listings
- Highlight unique value propositions and exclusive content
- Position against competitor weaknesses without naming them directly`;

    case "balanced":
    default:
      return `OPTIMIZATION PRIORITY: BALANCED
Apply equal weight to visibility, content quality, conversion, and competitive differentiation.
- Include high-impact keywords for search visibility
- Write compelling copy that earns clicks from SERPs
- Ensure content depth and quality meet user expectations
- Differentiate from competitors with unique positioning`;
  }
}

/* ── SEO Best Practices ──────────────────────────────────────── */

function getSeoComplianceRules(): string {
  return `SEO BEST PRACTICES — MANDATORY:

TITLE TAG RULES:
- Must be 30-60 characters (Google truncates at ~60 chars)
- Include primary keyword as close to the beginning as possible
- Include brand name (at end, separated by | or -)
- No keyword stuffing — max 2-3 keywords naturally integrated
- No duplicate title tags across the site
- No ALL CAPS unless it's a brand name
- Must accurately describe page content

META DESCRIPTION RULES:
- Must be 120-160 characters (Google truncates at ~160 chars)
- Include primary keyword and a compelling call-to-action
- Each page must have a unique meta description
- Should preview what the user will find on the page
- Use active voice and address the reader directly
- Include a value proposition or benefit statement

H1 TAG RULES:
- Every page should have exactly one H1
- H1 should be different from the title tag but semantically related
- Include the primary keyword naturally
- Should clearly describe the page topic to users
- No keyword stuffing in the H1

CONTENT RULES:
- Target 1500+ words for pillar/comprehensive pages
- Use H2/H3 subheadings every 200-300 words
- Include target keywords in first 100 words
- Use related/semantic keywords throughout (LSI terms)
- Add internal links to related pages on the site
- Include structured data where applicable`;
}

/* ── Product Category Inference ───────────────────────────────── */

function inferProductCategory(terms: string[]): string {
  const joined = terms.join(" ").toLowerCase();
  if (/\b(seo|search engine|ranking|serp|backlink|keyword|organic traffic|site audit|crawl|optic\s*rank)\b/.test(joined)) return "SEO / Search Engine Optimization";
  if (/\b(social media|instagram|tiktok|facebook|twitter|engagement|followers)\b/.test(joined)) return "Social Media Marketing";
  if (/\b(email marketing|newsletter|campaign|open rate|click rate)\b/.test(joined)) return "Email Marketing";
  if (/\b(ecommerce|shopping|product listing|cart|checkout)\b/.test(joined)) return "E-Commerce";
  if (/\b(crm|customer relationship|sales pipeline|lead)\b/.test(joined)) return "CRM / Sales";
  if (/\b(analytics|data|dashboard|reporting|metrics)\b/.test(joined)) return "Analytics / Data";
  if (/\b(ai|artificial intelligence|machine learning|llm|chatbot)\b/.test(joined)) return "AI / Machine Learning";
  return "Digital Marketing / SaaS";
}

/* ── Page Context ────────────────────────────────────────────── */

async function getPageContext(projectId: string, pageUrl: string, auditId?: string, projectName?: string, projectDomain?: string) {
  const [pageKeywords, allKeywords, backlinks, issues] = await Promise.all([
    getPageKeywords(projectId, pageUrl),
    getAllProjectKeywords(projectId),
    getPageBacklinks(projectId, pageUrl),
    auditId ? getPageAuditIssues(auditId, pageUrl) : Promise.resolve([]),
  ]);

  // Keywords ranking for this page
  const keywordsContext = pageKeywords.length > 0
    ? `PAGE KEYWORDS (${pageKeywords.length} keywords ranking for this URL):\n${pageKeywords.slice(0, 20).map((k) => `  - "${k.keyword}" → position: ${k.current_position ?? ">100"}, volume: ${k.search_volume?.toLocaleString() ?? "?"}/mo, difficulty: ${k.difficulty ?? "?"}, intent: ${k.intent ?? "?"}`).join("\n")}`
    : "PAGE KEYWORDS: No keywords currently ranking for this URL";

  // Near-miss keywords for this page
  const nearMiss = pageKeywords
    .filter((k) => k.current_position != null && k.current_position >= 4 && k.current_position <= 10 && (k.search_volume ?? 0) > 0)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
    .slice(0, 5);

  // High-value keywords
  const highValueKw = pageKeywords
    .filter((k) => k.current_position != null && k.current_position <= 20 && (k.search_volume ?? 0) >= 100)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
    .slice(0, 10)
    .map((k) => k.keyword);

  // Weak keywords (ranked but poorly)
  const weakKw = pageKeywords
    .filter((k) => k.current_position != null && k.current_position > 20)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
    .slice(0, 5)
    .map((k) => k.keyword);

  // Visibility context
  const ranked = pageKeywords.filter((r) => r.current_position != null && r.current_position > 0);
  const totalVol = pageKeywords.reduce((s, r) => s + (r.search_volume ?? 0), 0);
  const capturedVol = pageKeywords.reduce((s, r) => {
    if (r.current_position == null || r.current_position <= 0) return s;
    const w = r.current_position <= 3 ? 0.85 : r.current_position <= 10 ? 0.35 : r.current_position <= 25 ? 0.15 : 0.05;
    return s + w * (r.search_volume ?? 0);
  }, 0);
  const capturePct = totalVol > 0 ? Math.round((capturedVol / totalVol) * 100) : 0;

  const visibilityContext = [
    `VISIBILITY INTELLIGENCE:`,
    `  Keywords ranked: ${ranked.length}/${pageKeywords.length} | Volume captured: ${capturePct}%`,
    nearMiss.length > 0
      ? `  NEAR-MISS KEYWORDS (positions 4-10 — include these in title/H1 to push to top 3):\n${nearMiss.map((k) => `    - "${k.keyword}" #${k.current_position} (${(k.search_volume ?? 0).toLocaleString()} vol)`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");

  // ALL project keywords — tells AI what the site/product is about
  const allKeywordsContext = allKeywords.length > 0
    ? `PROJECT KEYWORDS (${allKeywords.length} keywords tracked across the whole site — this tells you what the product/site is about):\n${allKeywords.slice(0, 30).map((k) => `  - "${k.keyword}" (volume: ${(k.search_volume as number | null)?.toLocaleString() ?? "?"}/mo)`).join("\n")}`
    : "";

  // Backlinks context — ONLY authority signals, NOT anchor text (anchor text can mislead AI about product identity)
  const backlinksContext = backlinks.length > 0
    ? `BACKLINKS (${backlinks.length} links pointing to this page — authority signals ONLY):\n  Top referring domains: ${backlinks.slice(0, 5).map((b) => {
        try { return `${new URL(b.source_url).hostname} (DA: ${b.domain_authority ?? "?"})`; } catch { return `${b.source_url} (DA: ${b.domain_authority ?? "?"})`; }
      }).join(", ")}\n  NOTE: Backlink data shows WHO links to this page for authority purposes. Do NOT use backlink anchor text or source content to determine what this product/website does.`
    : "BACKLINKS: No backlinks found for this page";

  // Issues context
  const issuesContext = issues.length > 0
    ? `TECHNICAL ISSUES (${issues.length} issues):\n${issues.slice(0, 5).map((i) => `  - [${i.severity}] ${i.title}: ${i.description}`).join("\n")}`
    : "";

  // Product identity — derived from project keywords + domain name (the ONLY source of truth for what this product does)
  const topKeywordTerms = allKeywords.slice(0, 15).map((k) => k.keyword);
  let productIdentity: string;
  if (topKeywordTerms.length > 0) {
    productIdentity = `PRODUCT IDENTITY (SOURCE OF TRUTH — DO NOT OVERRIDE WITH ANY OTHER DATA):
This website's product/service is defined by the keywords its owners track. Based on these keywords: ${topKeywordTerms.join(", ")}
The product is clearly in the: ${inferProductCategory(topKeywordTerms)} space.
NEVER describe this product using information from backlinks, competitor sites, or external sources. ONLY use the project keywords above to understand what this product does.`;
  } else {
    // No keywords tracked — infer from project name and domain
    const nameAndDomain = [projectName, projectDomain].filter(Boolean).join(" ");
    const inferredCategory = inferProductCategory(nameAndDomain.split(/[\s\-_.\/]+/));
    productIdentity = `PRODUCT IDENTITY (SOURCE OF TRUTH — DO NOT OVERRIDE WITH ANY OTHER DATA):
No tracked keywords available yet. Product identity is derived from the project name "${projectName ?? "unknown"}" and domain "${projectDomain ?? "unknown"}".
Based on the name and domain, this product is in the: ${inferredCategory} space.
CRITICAL RULES:
- Do NOT use backlink anchor text, external site content, or any third-party references to describe this product
- Do NOT invent specific features — only use what the product name and domain imply
- If the name contains "rank", "optic rank", "SEO" — this is an SEO ranking/optimization tool
- NEVER reference "social sentiment", "social media monitoring", or any feature not implied by the product name
- When in doubt, describe the product as: "${projectName ?? "the product"}" — a ${inferredCategory.toLowerCase()} tool`;
  }

  return {
    pageKeywords,
    allKeywords,
    backlinks,
    issues,
    keywordsContext,
    allKeywordsContext,
    productIdentity,
    nearMiss,
    highValueKw,
    weakKw,
    visibilityContext,
    backlinksContext,
    issuesContext,
  };
}

/* ── Scoring Algorithm ───────────────────────────────────────── */

export async function scorePageSEO(
  title: string,
  metaDescription: string,
  h1: string,
  url: string,
  targetKeywords: string[],
  wordCount: number | null,
  loadTimeMs: number | null,
  lcpMs: number | null,
  cls: number | null,
  hasSchema: boolean,
  allProjectKeywords: string[] = []
): Promise<{
  score: number;
  recommendations: string[];
  breakdown: Record<string, number>;
}> {
  let score = 0;
  const recs: string[] = [];
  const breakdown: Record<string, number> = {};

  // Use all project keywords as fallback when no keywords rank for this specific URL
  const effectiveKeywords = targetKeywords.length > 0 ? targetKeywords : allProjectKeywords;

  // A. Title Tag (max 25 pts)
  const titleLen = title.trim().length;
  if (titleLen >= 30 && titleLen <= 60) {
    breakdown.title = 25;
  } else if (titleLen >= 20 && titleLen < 30) {
    breakdown.title = 15;
    recs.push(`Title too short (${titleLen} chars). Aim for 30-60 chars to maximize SERP real estate.`);
  } else if (titleLen > 60 && titleLen <= 70) {
    breakdown.title = 15;
    recs.push(`Title may be truncated in SERPs (${titleLen}/60 chars). Consider shortening.`);
  } else if (titleLen > 70) {
    breakdown.title = 10;
    recs.push(`Title will be truncated in SERPs (${titleLen} chars). Keep under 60 characters.`);
  } else if (titleLen > 0) {
    breakdown.title = 8;
    recs.push(`Title is very short (${titleLen} chars). Add keywords to improve discoverability.`);
  } else {
    breakdown.title = 0;
    recs.push("Missing title tag — this is critical for SEO rankings.");
  }
  score += breakdown.title;

  // B. Meta Description (max 15 pts)
  const metaLen = metaDescription.trim().length;
  if (metaLen >= 120 && metaLen <= 160) {
    breakdown.meta = 15;
  } else if (metaLen >= 80 && metaLen < 120) {
    breakdown.meta = 10;
    recs.push(`Meta description is short (${metaLen}/160 chars). Add more detail to improve CTR.`);
  } else if (metaLen > 160 && metaLen <= 200) {
    breakdown.meta = 10;
    recs.push(`Meta description may be truncated (${metaLen}/160 chars). Consider shortening.`);
  } else if (metaLen > 200) {
    breakdown.meta = 8;
    recs.push(`Meta description will be truncated (${metaLen} chars). Keep under 160 characters.`);
  } else if (metaLen > 0) {
    breakdown.meta = 5;
    recs.push(`Meta description too short (${metaLen} chars). Aim for 120-160 characters.`);
  } else {
    breakdown.meta = 0;
    recs.push("Missing meta description — Google may auto-generate one that doesn't convert well.");
  }
  score += breakdown.meta;

  // C. H1 Tag (max 10 pts)
  if (h1.trim().length > 0) {
    breakdown.h1 = 10;
  } else {
    breakdown.h1 = 0;
    recs.push("Missing H1 tag — add a clear, keyword-rich heading.");
  }
  score += breakdown.h1;

  // D. Keyword Placement (max 20 pts)
  let kwScore = 0;
  const titleLower = title.toLowerCase();
  const h1Lower = h1.toLowerCase();
  const metaLower = metaDescription.toLowerCase();

  // Normalize URL for matching
  let urlPath = "";
  try {
    urlPath = new URL(url).pathname.toLowerCase();
  } catch {
    urlPath = url.toLowerCase();
  }

  // Check up to 3 priority keywords (uses project keywords as fallback)
  const priorityKw = effectiveKeywords.slice(0, 3);
  if (priorityKw.length > 0) {
    let inTitle = 0, inH1 = 0, inMeta = 0, inUrl = 0;
    for (const kw of priorityKw) {
      const kwLower = kw.toLowerCase();
      if (titleLower.includes(kwLower)) inTitle++;
      if (h1Lower.includes(kwLower)) inH1++;
      if (metaLower.includes(kwLower)) inMeta++;
      if (urlPath.includes(kwLower.replace(/\s+/g, "-"))) inUrl++;
    }
    const titlePts = Math.round((inTitle / priorityKw.length) * 8);
    const h1Pts = Math.round((inH1 / priorityKw.length) * 5);
    const metaPts = Math.round((inMeta / priorityKw.length) * 4);
    const urlPts = Math.round((inUrl / priorityKw.length) * 3);
    kwScore = titlePts + h1Pts + metaPts + urlPts;

    if (inTitle === 0) recs.push("Primary keyword is missing from the title tag.");
    if (inH1 === 0 && h1.trim().length > 0) recs.push("Primary keyword is missing from the H1 heading.");
    if (inMeta === 0 && metaDescription.trim().length > 0) recs.push("Primary keyword is missing from the meta description.");
  } else {
    // No keywords tracked at all — can't evaluate keyword placement, give neutral score
    kwScore = 10;
    recs.push("No keywords tracked yet. Add keywords in the Keywords section to get accurate keyword placement scoring.");
  }
  breakdown.keywords = kwScore;
  score += kwScore;

  // E. Content Depth (max 15 pts)
  const wc = wordCount ?? 0;
  if (wc >= 1500) {
    breakdown.content = 15;
  } else if (wc >= 800) {
    breakdown.content = 10;
    recs.push(`Content is ${wc} words. Expand to 1500+ for comprehensive coverage.`);
  } else if (wc >= 300) {
    breakdown.content = 5;
    recs.push(`Thin content (${wc} words). Google prefers in-depth pages — aim for 1500+ words.`);
  } else if (wc === 0 && wordCount === null) {
    // Word count not available from crawler — don't penalize
    breakdown.content = 8;
    recs.push("Word count not available from audit. Re-run site audit to capture content data.");
  } else {
    breakdown.content = 0;
    recs.push(`Very thin content (${wc} words). Pages with <300 words rarely rank well. If the page has JS-rendered content, re-run the site audit to capture it.`);
  }
  score += breakdown.content;

  // F. Technical Signals (max 10 pts)
  let techScore = 0;
  if (loadTimeMs != null && loadTimeMs < 3000) techScore += 3;
  else if (loadTimeMs != null) recs.push(`Page load time is ${(loadTimeMs / 1000).toFixed(1)}s — aim for under 3s.`);

  if (lcpMs != null && lcpMs < 2500) techScore += 2;
  else if (lcpMs != null) recs.push(`LCP is ${(lcpMs / 1000).toFixed(1)}s — aim for under 2.5s for good Core Web Vitals.`);

  if (cls != null && cls < 0.1) techScore += 2;
  else if (cls != null) recs.push(`CLS is ${cls.toFixed(3)} — aim for under 0.1 to avoid layout shift penalties.`);

  if (hasSchema) techScore += 3;
  else recs.push("No structured data detected — add schema markup for rich results.");

  breakdown.technical = techScore;
  score += techScore;

  // G. Keyword Density Bonus (max 5 pts)
  let densityScore = 0;
  if (effectiveKeywords.length > 0) {
    let found = 0;
    for (const kw of effectiveKeywords.slice(0, 10)) {
      if (titleLower.includes(kw.toLowerCase()) || metaLower.includes(kw.toLowerCase())) found++;
    }
    densityScore = Math.round((found / Math.min(effectiveKeywords.length, 10)) * 5);
  } else {
    // No keywords — give neutral score
    densityScore = 2;
  }
  breakdown.density = densityScore;
  score += densityScore;

  // Compliance deductions
  if (title.trim() && h1.trim() && title.trim().toLowerCase() === h1.trim().toLowerCase()) {
    score -= 5;
    recs.push("Title tag and H1 are identical — differentiate them for better keyword coverage.");
  }

  const pipeCount = (title.match(/\|/g) || []).length;
  if (pipeCount > 2) {
    score -= 5;
    recs.push("Title has too many separators — this looks like keyword stuffing to Google.");
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    recommendations: recs,
    breakdown,
  };
}

/* ── Save Optimization ─────────────────────────────────────── */

export async function savePageOptimization(
  projectId: string,
  pageUrl: string,
  scoreBefore: number,
  scoreAfter: number,
  original: { title: string; meta: string; h1: string },
  optimized: { title: string; meta: string; h1: string },
  goal: WebOptimizationGoal,
  contentBrief?: string,
  recommendations?: string[]
): Promise<{ error: string } | { success: true; id: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("page_optimizations")
    .insert({
      project_id: projectId,
      page_url: pageUrl,
      score_before: scoreBefore,
      score_after: scoreAfter,
      original_title: original.title || null,
      original_meta: original.meta || null,
      original_h1: original.h1 || null,
      optimized_title: optimized.title || null,
      optimized_meta: optimized.meta || null,
      optimized_h1: optimized.h1 || null,
      optimization_goal: goal,
      content_brief: contentBrief || null,
      recommendations: recommendations ?? [],
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id };
}

/* ── AI: Title Tag Variants ──────────────────────────────────── */

export async function generateTitleTagVariants(
  projectId: string,
  pageUrl: string,
  currentTitle: string,
  targetKeywords: string[],
  goal: WebOptimizationGoal = "balanced"
): Promise<{ error: string } | { success: true; variants: Array<{ title: string; score: number; reason: string }> }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("name, domain")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Project not found." };

  const ctx = await getPageContext(projectId, pageUrl, undefined, project.name, project.domain);
  const goalDirective = getWebGoalDirective(goal);

  const kwList = targetKeywords.length > 0
    ? targetKeywords.join(", ")
    : ctx.highValueKw.length > 0
      ? ctx.highValueKw.slice(0, 5).join(", ")
      : ctx.allKeywords.slice(0, 5).map((k) => k.keyword).join(", ") || `${project.name} (derive keywords from the product name and domain)`;

  const prompt = `Generate 5 optimized title tags for this web page. The title tag is the #1 on-page ranking factor.

${goalDirective}

Website: "${project.name}" (${project.domain})
Page URL: ${pageUrl}
Current Title: "${currentTitle}"

${ctx.productIdentity}

${ctx.allKeywordsContext}

${ctx.keywordsContext}
${ctx.visibilityContext}

PRIORITY KEYWORDS to include: ${kwList}
${ctx.weakKw.length > 0 ? `OPPORTUNITY KEYWORDS (currently ranked poorly, worth targeting): ${ctx.weakKw.join(", ")}` : ""}

CRITICAL — PRODUCT IDENTITY RULES:
1. The PRODUCT IDENTITY section above is the ONLY source of truth for what this product does
2. IGNORE any backlink anchor text, competitor descriptions, or external source content
3. Your titles MUST use terminology from the PROJECT KEYWORDS — these are what the product owners chose to track
4. If the keywords mention "SEO", "keyword tracking", "site audit", etc., this is an SEO tool — NOT a social media, sentiment, or analytics tool
5. Do NOT invent features or capabilities not supported by the project keywords

For each title:
- ABSOLUTE HARD LIMIT: Each title MUST be 55 characters or fewer (Google truncates at 60, leave buffer)
- Count the characters carefully — if a title exceeds 55 characters, shorten it
- Include primary keyword as close to the beginning as possible
- Include brand name "${project.name}" at the end (separated by | or -)
- NEAR-MISS keywords (positions 4-10) get TOP PRIORITY
- Each variant MUST be meaningfully different
- Score should reflect expected VISIBILITY IMPACT

${getSeoComplianceRules()}

Variation seed: ${Date.now()}

Return ONLY a JSON array: [{"title": "...", "score": 85, "reason": "Targets near-miss keyword X + high-volume keyword Y"}, ...]`;

  const result = await aiChat(prompt, {
    temperature: 0.95,
    maxTokens: 600,
    context: { feature: "web_optimizer", sub_type: "title_variants", metadata: { projectId, pageUrl } },
  });

  let variants: Array<{ title: string; score: number; reason: string }> = [];
  if (result?.text) {
    try {
      const match = result.text.match(/\[[\s\S]*?\]/);
      if (match) variants = JSON.parse(match[0]);
    } catch { /* parse error */ }
  }

  variants = variants
    .map((v) => ({ ...v, title: v.title.trim() }))
    .filter((v) => v.title.length <= 60 && v.title.length > 0);

  if (variants.length === 0) {
    const brandName = project.name ?? "Site";
    variants = [
      { title: `${currentTitle.slice(0, 45)} | ${brandName}`, score: 60, reason: "Current title + brand" },
      { title: `${kwList.split(",")[0]?.trim() ?? "Page"} — ${brandName}`, score: 55, reason: "Primary keyword + brand" },
    ];
  }

  return { success: true, variants };
}

/* ── AI: Meta Description ────────────────────────────────────── */

export async function generateMetaDescriptionVariant(
  projectId: string,
  pageUrl: string,
  currentMeta: string,
  currentTitle: string,
  goal: WebOptimizationGoal = "balanced"
): Promise<{ error: string } | { success: true; metaDescription: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("name, domain")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Project not found." };

  const ctx = await getPageContext(projectId, pageUrl, undefined, project.name, project.domain);
  const goalDirective = getWebGoalDirective(goal);

  const prompt = `Generate an optimized meta description for this web page. The meta description is critical for click-through rate from search results — it's your "ad copy" in Google.

${goalDirective}

Website: "${project.name}" (${project.domain})
Page URL: ${pageUrl}
Current Title: "${currentTitle}"
Current Meta Description: "${currentMeta || "none"}"

${ctx.productIdentity}

${ctx.allKeywordsContext}

${ctx.keywordsContext}
${ctx.visibilityContext}

CRITICAL — PRODUCT IDENTITY RULES:
1. The PRODUCT IDENTITY section above is the ONLY source of truth for what this product does
2. IGNORE any backlink anchor text, competitor descriptions, or external source content
3. Your meta description MUST use terminology from the PROJECT KEYWORDS
4. Do NOT invent features or capabilities not supported by the project keywords

Requirements:
- MUST be 120-160 characters
- Include primary keyword naturally
- Write a compelling value proposition that makes searchers click
- Include a call-to-action (Learn, Discover, Try, Get, Start)
- Address the search intent behind the target keywords
- Generate a FRESH result each time

${getSeoComplianceRules()}

Variation seed: ${Date.now()}

Return ONLY the meta description text (no quotes, no explanation).`;

  const result = await aiChat(prompt, {
    temperature: 0.95,
    maxTokens: 200,
    context: { feature: "web_optimizer", sub_type: "meta_description", metadata: { projectId, pageUrl } },
  });

  const metaDescription = result?.text?.replace(/^["']|["']$/g, "").trim().slice(0, 160) ?? "";
  return { success: true, metaDescription };
}

/* ── AI: H1 Variant ──────────────────────────────────────────── */

export async function generateH1Variant(
  projectId: string,
  pageUrl: string,
  currentH1: string,
  currentTitle: string,
  goal: WebOptimizationGoal = "balanced"
): Promise<{ error: string } | { success: true; h1: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("name, domain")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Project not found." };

  const ctx = await getPageContext(projectId, pageUrl, undefined, project.name, project.domain);
  const goalDirective = getWebGoalDirective(goal);

  const prompt = `Generate an optimized H1 heading for this web page. The H1 is the main heading users see first and is a strong ranking signal.

${goalDirective}

Website: "${project.name}" (${project.domain})
Page URL: ${pageUrl}
Current Title Tag: "${currentTitle}"
Current H1: "${currentH1 || "none"}"

${ctx.productIdentity}

${ctx.allKeywordsContext}

${ctx.keywordsContext}
${ctx.visibilityContext}

CRITICAL — PRODUCT IDENTITY RULES:
1. The PRODUCT IDENTITY section above is the ONLY source of truth for what this product does
2. IGNORE any backlink anchor text, competitor descriptions, or external source content
3. Your H1 MUST use terminology from the PROJECT KEYWORDS
4. Do NOT invent features or capabilities not supported by the project keywords

Requirements:
- Should be different from the title tag but semantically related
- Include primary keyword naturally
- Be descriptive and compelling for users (not just search engines)
- Typically 20-70 characters
- Must clearly convey the page's main topic
- Generate a FRESH result each time

Variation seed: ${Date.now()}

Return ONLY the H1 heading text (no quotes, no explanation, no HTML tags).`;

  const result = await aiChat(prompt, {
    temperature: 0.95,
    maxTokens: 100,
    context: { feature: "web_optimizer", sub_type: "h1_variant", metadata: { projectId, pageUrl } },
  });

  const h1 = result?.text?.replace(/^["']|["']$/g, "").replace(/<[^>]+>/g, "").trim() ?? "";
  return { success: true, h1 };
}

/* ── AI: Full Page Optimization ──────────────────────────────── */

/* ── Export All Pages (Score + AI optimization for every page) ── */

export async function exportAllPagesOptimization(
  projectId: string,
  pagesInput: Array<{
    url: string;
    title: string | null;
    metaDescription: string | null;
    h1: string | null;
    wordCount: number | null;
    loadTimeMs: number | null;
    lcpMs: number | null;
    cls: number | null;
    hasSchema: boolean;
  }>,
  goal: WebOptimizationGoal = "balanced"
): Promise<{ error: string } | { text: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, name, domain")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Project not found" };

  const allKw = await getAllProjectKeywords(projectId);
  const allKwStrings = allKw.map((k) => k.keyword);

  const dateStr = new Date().toLocaleDateString();
  let output = `SEO OPTIMIZATION REPORT — ${project.name}\n`;
  output += `${"=".repeat(60)}\n`;
  output += `Generated: ${dateStr}\n`;
  output += `Pages Analyzed: ${pagesInput.length}\n`;
  output += `Optimization Goal: ${goal}\n\n`;

  // Score each page
  const results: Array<{ url: string; score: number; recs: string[] }> = [];

  for (const pg of pagesInput) {
    const pageKw = allKw
      .filter((k) => k.url === pg.url)
      .map((k) => k.keyword);

    const scoreResult = await scorePageSEO(
      pg.title ?? "",
      pg.metaDescription ?? "",
      pg.h1 ?? "",
      pg.url,
      pageKw,
      pg.wordCount,
      pg.loadTimeMs,
      pg.lcpMs,
      pg.cls,
      pg.hasSchema,
      allKwStrings
    );

    results.push({ url: pg.url, score: scoreResult.score, recs: scoreResult.recommendations });

    // Format page path for display
    let pagePath = pg.url;
    try { pagePath = new URL(pg.url).pathname || "/"; } catch { /* keep as-is */ }

    output += `${"─".repeat(60)}\n`;
    output += `PAGE: ${pagePath}\n`;
    output += `Score: ${scoreResult.score}/100\n\n`;

    output += `TITLE TAG\n`;
    output += `${pg.title ?? "(empty — needs title tag)"}\n`;
    output += `Characters: ${(pg.title ?? "").length}/60\n\n`;

    output += `META DESCRIPTION\n`;
    output += `${pg.metaDescription ?? "(empty — needs meta description)"}\n`;
    output += `Characters: ${(pg.metaDescription ?? "").length}/160\n\n`;

    output += `H1 HEADING\n`;
    output += `${pg.h1 ?? "(empty — needs H1 heading)"}\n\n`;

    if (scoreResult.recommendations.length > 0) {
      output += `RECOMMENDATIONS\n`;
      scoreResult.recommendations.forEach((r) => { output += `• ${r}\n`; });
    }

    output += `\n`;
  }

  // Summary
  const avg = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0;
  const critical = results.filter((r) => r.score < 40);
  const needsWork = results.filter((r) => r.score >= 40 && r.score < 60);
  const good = results.filter((r) => r.score >= 60 && r.score < 80);
  const excellent = results.filter((r) => r.score >= 80);

  output += `${"=".repeat(60)}\n`;
  output += `SUMMARY\n`;
  output += `${"=".repeat(60)}\n`;
  output += `Average Score: ${avg}/100\n`;
  output += `Excellent (80+): ${excellent.length} pages\n`;
  output += `Good (60-79): ${good.length} pages\n`;
  output += `Needs Work (40-59): ${needsWork.length} pages\n`;
  output += `Critical (<40): ${critical.length} pages\n\n`;
  output += `— Generated by Optic Rank Page Optimizer\n`;

  return { text: output };
}

export async function generateFullPageOptimization(
  projectId: string,
  pageUrl: string,
  currentTitle: string,
  currentMeta: string,
  currentH1: string,
  wordCount: number | null,
  goal: WebOptimizationGoal = "balanced"
): Promise<{ error: string } | {
  success: true;
  recommendation: {
    title: string;
    metaDescription: string;
    h1: string;
    contentBrief: string;
    schemaRecommendation: string;
    internalLinkingSuggestions: string[];
    analysis: string;
    dataSources: { keywords: number; backlinks: number; issues: number };
  };
}> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("name, domain")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Project not found." };

  // Get audit ID for issue context
  const { data: audit } = await supabase
    .from("site_audits")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  const ctx = await getPageContext(projectId, pageUrl, audit?.id, project.name, project.domain);
  const goalDirective = getWebGoalDirective(goal);

  const prompt = `You are a world-class SEO strategist. Analyze this web page and generate a complete optimization recommendation.

${goalDirective}

WEBSITE: "${project.name}" (${project.domain})
PAGE URL: ${pageUrl}
CURRENT TITLE: "${currentTitle}"
CURRENT META DESCRIPTION: "${currentMeta || "none"}"
CURRENT H1: "${currentH1 || "none"}"
WORD COUNT: ${wordCount ?? "unknown"}

${ctx.productIdentity}

${ctx.allKeywordsContext}

${ctx.keywordsContext}

${ctx.visibilityContext}

${ctx.backlinksContext}

${ctx.issuesContext || "NO TECHNICAL ISSUES DETECTED"}

CRITICAL — PRODUCT IDENTITY RULES (MUST FOLLOW):
1. The PRODUCT IDENTITY section above is the ONLY source of truth for what this product does
2. The BACKLINKS section is ONLY for authority/trust signals — NEVER use backlink anchor text or source page content to determine what this product does
3. ALL recommendations (title, meta, H1, content brief) MUST align with the PROJECT KEYWORDS
4. If the keywords mention "SEO", "keyword tracking", "site audit", "backlinks", "rankings" — this is an SEO tool
5. Do NOT invent features, capabilities, or product categories that the project keywords don't support
6. Do NOT reference or describe features mentioned in backlink anchor text if they contradict the project keywords

Now write the COMPLETE optimized page recommendation. Return ONLY valid JSON:
{
  "analysis": "2-3 sentences explaining your SEO strategy for this page — which keywords will move the needle most and why",
  "title": "optimized title tag (MUST be 55 characters or fewer — count carefully, include primary keyword near start, brand at end)",
  "meta_description": "optimized meta description (120-160 chars, compelling CTR-focused copy with keyword and CTA)",
  "h1": "optimized H1 heading (different from title but related, includes primary keyword)",
  "content_brief": "3-5 bullet points: what content to add/improve, subtopics to cover, word count target, content structure recommendations",
  "schema_recommendation": "which schema markup to add (e.g., Article, FAQ, HowTo, Product, BreadcrumbList) and why",
  "internal_linking": ["suggestion 1: link from/to which pages and with what anchor text", "suggestion 2", "suggestion 3"]
}

CRITICAL RULES:
1. NEAR-MISS KEYWORDS (positions 4-10) go in title and H1 FIRST
2. Title MUST be 55 characters or fewer — count every character including spaces and separators
3. Meta description MUST be 120-160 characters
4. Content brief should be specific and actionable, not generic advice
5. Schema recommendation should match the page type and content
6. Internal linking suggestions should reference actual pages on the site where possible
7. Generate a FRESH recommendation each time
8. NEVER make up what the product does — use the project keywords as your source of truth

${getSeoComplianceRules()}

Variation seed: ${Date.now()}`;

  const result = await aiChat(prompt, {
    temperature: 0.9,
    maxTokens: 2000,
    jsonMode: true,
    context: { feature: "web_optimizer", sub_type: "full_recommendation", metadata: { projectId, pageUrl } },
  });

  if (!result?.text) return { error: "AI failed to generate recommendation. Please try again." };

  try {
    const parsed = JSON.parse(result.text) as {
      analysis?: string;
      title?: string;
      meta_description?: string;
      h1?: string;
      content_brief?: string;
      schema_recommendation?: string;
      internal_linking?: string[];
    };

    return {
      success: true,
      recommendation: {
        title: (parsed.title ?? currentTitle).slice(0, 60),
        metaDescription: (parsed.meta_description ?? "").slice(0, 160),
        h1: parsed.h1 ?? "",
        contentBrief: parsed.content_brief ?? "",
        schemaRecommendation: parsed.schema_recommendation ?? "",
        internalLinkingSuggestions: parsed.internal_linking ?? [],
        analysis: parsed.analysis ?? "Optimized based on your keyword rankings and page data.",
        dataSources: {
          keywords: ctx.pageKeywords.length,
          backlinks: ctx.backlinks.length,
          issues: ctx.issues.length,
        },
      },
    };
  } catch {
    return { error: "Failed to parse AI response. Please try again." };
  }
}
