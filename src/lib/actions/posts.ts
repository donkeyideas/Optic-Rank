"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";
import { aiChat } from "@/lib/ai/ai-provider";

export async function createPost(formData: {
  type: "blog" | "guide";
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  cover_image?: string;
  author_name?: string;
  status: "draft" | "published";
  tags?: string[];
}): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("posts").insert({
    type: formData.type,
    title: formData.title,
    slug: formData.slug,
    excerpt: formData.excerpt ?? null,
    content: formData.content,
    cover_image: formData.cover_image ?? null,
    author_name: formData.author_name ?? "Optic Rank Team",
    status: formData.status,
    tags: formData.tags ?? [],
    published_at: formData.status === "published" ? new Date().toISOString() : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/blog");
  revalidatePath("/guides");
  revalidatePath("/admin/blog");
  return { success: true };
}

export async function updatePost(
  id: string,
  formData: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    cover_image?: string;
    author_name?: string;
    status?: "draft" | "published";
    tags?: string[];
  }
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {
    ...formData,
    updated_at: new Date().toISOString(),
  };

  if (formData.status === "published" && formData.status !== undefined) {
    // Set published_at if transitioning to published
    const { data: existing } = await supabase
      .from("posts")
      .select("published_at")
      .eq("id", id)
      .single();
    if (!existing?.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/blog");
  revalidatePath("/guides");
  revalidatePath("/admin/blog");
  return { success: true };
}

export async function deletePost(
  id: string
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/blog");
  revalidatePath("/guides");
  revalidatePath("/admin/blog");
  return { success: true };
}

/**
 * Generate blog content using AI (DeepSeek or fallback provider).
 * Returns clean HTML optimized for SEO, GEO, AEO, and CRO.
 */
export async function generateBlogWithAI(
  title: string,
  type: "blog" | "guide" = "blog",
  backlink?: string
): Promise<{ error: string } | { content: string; excerpt: string; tags: string[] }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const internalPages = [
    { path: "/features", label: "SEO Features" },
    { path: "/search-ai", label: "AI Search Visibility" },
    { path: "/pricing", label: "Pricing Plans" },
    { path: "/blog", label: "Blog" },
    { path: "/guides", label: "SEO Guides" },
    { path: "/about", label: "About Optic Rank" },
    { path: "/changelog", label: "Product Changelog" },
    { path: "/roadmap", label: "Product Roadmap" },
    { path: "/contact", label: "Contact Us" },
    { path: "/careers", label: "Careers" },
  ];

  const internalLinksContext = internalPages
    .map((p) => `- ${p.label}: ${p.path}`)
    .join("\n");

  const prompt = `You are an expert SEO content writer for Optic Rank, an AI-powered SEO intelligence platform. Write a comprehensive ${type === "guide" ? "guide" : "blog post"} with the title: "${title}"

CRITICAL FORMATTING RULES:
- Output ONLY clean HTML. No markdown whatsoever.
- Do NOT use ## or ** or any markdown syntax.
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <blockquote>.
- Do NOT include <h1> — the title is rendered separately.
- Do NOT include <html>, <head>, <body>, or <article> wrapper tags.
- Every section must have an <h2> heading.
- Use <h3> for subsections within an <h2>.
- Wrap all body text in <p> tags.
- Use <strong> for emphasis on important terms (not markdown **).
- Use <em> for secondary emphasis.

SEO OPTIMIZATION:
- Write 1500-2500 words of high-quality, original content.
- Include the primary keyword naturally in the first paragraph.
- Use semantic keyword variations throughout.
- Write for featured snippets: include a concise definition or answer early.
- Structure content with clear H2/H3 hierarchy for passage indexing.
- Include a "Key Takeaways" or "Quick Summary" section near the top for AI answer engines.

GEO (Generative Engine Optimization):
- Write content that AI models would cite as authoritative.
- Include specific data points, statistics, and factual claims.
- Use clear, definitive statements that AI can extract as answers.
- Structure information in a way that's easy for LLMs to parse.

AEO (Answer Engine Optimization):
- Include FAQ-style content with clear question-and-answer pairs.
- Write concise, direct answers that AI assistants can surface.
- Use structured sections that map to common user queries.

CRO (Conversion Rate Optimization):
- Include natural calls-to-action linking to Optic Rank features.
- Mention how Optic Rank solves problems discussed in the article.
- End with a compelling CTA section.

LINKING REQUIREMENTS:
1. Internal links — Include 3-5 internal links to these Optic Rank pages where contextually relevant:
${internalLinksContext}
   Format: <a href="/path">anchor text</a>

2. External links — Include 2-4 outbound links to authoritative sources (Google, Moz, Search Engine Journal, Ahrefs, etc.) for credibility.
   Format: <a href="https://example.com" target="_blank" rel="noopener noreferrer">anchor text</a>

3. Do NOT use generic anchor text like "click here" or "read more". Use descriptive, keyword-rich anchor text.
${backlink ? `\n4. BACKLINK (IMPORTANT): You MUST include a natural, contextually relevant dofollow link to this URL: ${backlink}\n   - Weave it into the body content where it adds value to the reader.\n   - Use descriptive, keyword-rich anchor text related to the page content.\n   - Format: <a href="${backlink}" target="_blank" rel="dofollow">descriptive anchor text</a>\n   - Do NOT force it — integrate it so it reads naturally within a paragraph.` : ""}

STRUCTURE:
- Start with an engaging introduction paragraph.
- Include 4-6 main sections with H2 headings.
- Add subsections with H3 where needed.
- Include at least one bulleted list and one numbered list.
- End with a conclusion and clear CTA.

OUTPUT FORMAT:
Return ONLY the HTML content. No preamble, no explanation, no code blocks. Just the raw HTML starting with the first <p> or <h2> tag.

Also, at the very end, on a new line, add this exact separator and metadata:
---METADATA---
EXCERPT: [Write a compelling 150-160 character meta description for this post]
TAGS: [Comma-separated list of 3-5 relevant tags like: seo, ai-search, keyword-tracking]`;

  let result;
  try {
    result = await aiChat(prompt, {
      temperature: 0.7,
      maxTokens: 4096,
      timeout: 300000,
    });
  } catch (err) {
    console.error("[generateBlogWithAI] aiChat threw:", err);
    return { error: `AI error: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!result) {
    return { error: "AI generation failed. Please check that an AI provider (DeepSeek, OpenAI, or Gemini) is configured in Admin → API Config with a valid API key." };
  }

  // Parse the response to extract content, excerpt, and tags
  let content = result.text;
  let excerpt = "";
  let tags: string[] = [];

  const metaSplit = content.split("---METADATA---");
  if (metaSplit.length > 1) {
    content = metaSplit[0].trim();
    const metaSection = metaSplit[1];

    const excerptMatch = metaSection.match(/EXCERPT:\s*(.+)/);
    if (excerptMatch) excerpt = excerptMatch[1].trim();

    const tagsMatch = metaSection.match(/TAGS:\s*(.+)/);
    if (tagsMatch) {
      tags = tagsMatch[1].split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    }
  }

  // Clean up any remaining markdown that might have slipped through
  content = content
    .replace(/^```html?\s*/gm, "")
    .replace(/^```\s*$/gm, "")
    .replace(/^#{1,6}\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .trim();

  return { content, excerpt, tags };
}
