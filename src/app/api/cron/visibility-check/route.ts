/**
 * Cron API route for weekly AI visibility checks.
 * Queries LLMs (ChatGPT, Claude, Gemini, Perplexity, DeepSeek) to see if
 * each project's brand/domain is mentioned for its tracked keywords.
 * Scheduled: Wednesday 3 AM UTC (vercel.json).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkLLMVisibility } from "@/lib/ai/llm-visibility";

export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
const KEYWORDS_PER_PROJECT = 10; // Top keywords by search volume

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  // Create a pending job record
  const { data: job } = await supabase
    .from("job_queue")
    .insert({ job_type: "visibility_check", status: "pending", payload: {} })
    .select("id")
    .single();
  const jobId = job?.id;

  if (jobId) {
    await supabase
      .from("job_queue")
      .update({ status: "processing", locked_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  try {
    // Get all active projects with domains
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, domain")
      .eq("is_active", true)
      .not("domain", "is", null);

    if (!projects || projects.length === 0) {
      if (jobId) {
        await supabase
          .from("job_queue")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            payload: { processed: 0, checks: 0 },
          })
          .eq("id", jobId);
      }
      return NextResponse.json({ processed: 0, checks: 0 });
    }

    let totalChecks = 0;
    let processed = 0;
    const errors: string[] = [];

    for (const project of projects) {
      try {
        // Get top keywords by search volume
        const { data: keywords } = await supabase
          .from("keywords")
          .select("id, keyword")
          .eq("project_id", project.id)
          .order("search_volume", { ascending: false, nullsFirst: false })
          .limit(KEYWORDS_PER_PROJECT);

        if (!keywords || keywords.length === 0) continue;

        const brand = project.name;
        const domain = project.domain!;

        // Process keywords in batches of 2 to respect rate limits
        for (let i = 0; i < keywords.length; i += 2) {
          const batch = keywords.slice(i, i + 2);
          const results = await Promise.allSettled(
            batch.map((kw) => checkLLMVisibility(kw.keyword, brand, domain))
          );

          for (let j = 0; j < results.length; j++) {
            const result = results[j];
            if (result.status !== "fulfilled" || !result.value.data) continue;

            const visibility = result.value.data;
            const keywordId = batch[j].id;

            // Store each LLM result
            for (const check of visibility.results) {
              await supabase.from("ai_visibility_checks").insert({
                keyword_id: keywordId,
                llm_provider: check.llm_provider,
                query_text: check.query,
                response_text: check.response_excerpt,
                brand_mentioned: check.brand_mentioned,
                mention_position: check.mention_position,
                url_cited: check.url_cited,
                sentiment: check.sentiment,
                competitor_mentions: check.competitor_mentions,
              });
              totalChecks++;
            }

            // Update keyword visibility score
            await supabase
              .from("keywords")
              .update({
                ai_visibility_score: visibility.visibility_score,
                ai_visibility_count: visibility.label,
              })
              .eq("id", keywordId);
          }

          // Delay between batches
          if (i + 2 < keywords.length) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        processed++;
      } catch (err) {
        errors.push(
          `${project.name}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    if (jobId) {
      await supabase
        .from("job_queue")
        .update({
          status: errors.length > 0 && processed === 0 ? "failed" : "completed",
          completed_at: new Date().toISOString(),
          payload: { processed, checks: totalChecks, errors: errors.length },
          last_error: errors.length > 0 ? errors.join("; ").slice(0, 500) : null,
        })
        .eq("id", jobId);
    }

    return NextResponse.json({
      processed,
      checks: totalChecks,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (jobId) {
      await supabase
        .from("job_queue")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          last_error: msg,
        })
        .eq("id", jobId);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
