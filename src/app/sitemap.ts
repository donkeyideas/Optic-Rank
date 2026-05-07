import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPETITORS } from "./(marketing)/compare/_data/competitors";
import { INDUSTRIES } from "./(marketing)/seo-for/_data/industries";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://www.opticrank.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/features`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/pricing`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/guides`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/changelog`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/docs`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/roadmap`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/search-ai`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/social-intelligence`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/app-store-optimization`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/press`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/careers`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.2 },

    // Comparison pages
    { url: `${BASE}/compare`, changeFrequency: "monthly", priority: 0.8 },
    ...COMPETITORS.map((c) => ({
      url: `${BASE}/compare/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Free tool pages
    { url: `${BASE}/tools`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tools/meta-tag-analyzer`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/tools/keyword-density-checker`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/tools/serp-checker`, changeFrequency: "monthly", priority: 0.7 },

    // Glossary landing
    { url: `${BASE}/glossary`, changeFrequency: "weekly", priority: 0.8 },

    // Industry pages
    { url: `${BASE}/seo-for`, changeFrequency: "monthly", priority: 0.8 },
    ...INDUSTRIES.map((i) => ({
      url: `${BASE}/seo-for/${i.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  // Dynamic pages from Supabase
  const dynamicPages: MetadataRoute.Sitemap = [];

  try {
    const admin = createAdminClient();

    // Blog & guide posts
    const { data: posts } = await admin
      .from("posts")
      .select("slug, type, published_at, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (posts) {
      for (const post of posts) {
        const prefix = post.type === "guide" ? "/guides" : "/blog";
        dynamicPages.push({
          url: `${BASE}${prefix}/${post.slug}`,
          lastModified: post.updated_at || post.published_at,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }

    // Glossary terms
    const { data: glossaryTerms } = await admin
      .from("glossary_terms")
      .select("slug, updated_at")
      .eq("status", "published");

    if (glossaryTerms) {
      for (const term of glossaryTerms) {
        dynamicPages.push({
          url: `${BASE}/glossary/${term.slug}`,
          lastModified: term.updated_at,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  } catch {
    // If Supabase is unavailable, return static pages only
  }

  return [...staticPages, ...dynamicPages];
}
