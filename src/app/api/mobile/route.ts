import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mobileTokenStorage } from "@/lib/supabase/mobile-context";

// Site audits and other actions can take a while — extend timeout
export const maxDuration = 60;

// Server actions — these use createClient() which will detect the mobile token via AsyncLocalStorage
import { generateKeywordsAI } from "@/lib/actions/keywords";
import { generateCompetitorsAI } from "@/lib/actions/competitors";
import { discoverBacklinks } from "@/lib/actions/backlinks";
import { generatePredictions } from "@/lib/actions/predictions";
import { runVisibilityCheck } from "@/lib/actions/ai-visibility";
import { generateBrief } from "@/lib/actions/briefs";
import {
  detectContentDecay,
  detectCannibalization,
  suggestInternalLinks,
  generateContentBriefs,
} from "@/lib/actions/content";
import { runSiteAudit } from "@/lib/actions/site-audit";
import { extractProjectEntities } from "@/lib/actions/entities";
import { generateInsightsForProject } from "@/lib/actions/insights";

type ActionResult =
  | { error: string }
  | { success: true; [key: string]: unknown };

/**
 * Universal mobile API endpoint.
 *
 * POST /api/mobile
 * Headers: Authorization: Bearer <supabase-jwt>
 * Body: { action: string, projectId: string, ...params }
 */
export async function POST(request: NextRequest) {
  // 1. Extract Bearer token
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  // 2. Verify user
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // 3. Parse body
  let body: { action: string; projectId: string; [key: string]: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, projectId } = body;
  if (!action || !projectId) {
    return NextResponse.json(
      { error: "action and projectId are required" },
      { status: 400 }
    );
  }

  // 4. Dispatch action — run within mobileTokenStorage context
  // so that server actions' createClient() uses the JWT instead of cookies
  try {
    const result: ActionResult = await mobileTokenStorage.run(
      token,
      async () => {
        switch (action) {
          case "generateKeywordsAI":
            return generateKeywordsAI(projectId);

          case "generateCompetitorsAI":
            return generateCompetitorsAI(projectId);

          case "discoverBacklinks":
            return discoverBacklinks(projectId);

          case "generatePredictions":
            return generatePredictions(
              projectId,
              typeof body.horizonDays === "number" ? body.horizonDays : 7
            );

          case "runVisibilityCheck":
            return runVisibilityCheck(
              projectId,
              Array.isArray(body.keywordIds) ? body.keywordIds : undefined
            );

          case "generateBrief":
            return generateBrief(
              projectId,
              (body.briefType as "daily" | "weekly" | "monthly" | "on_demand") ??
                "on_demand"
            );

          case "detectContentDecay":
            return detectContentDecay(projectId);

          case "detectCannibalization":
            return detectCannibalization(projectId);

          case "suggestInternalLinks":
            return suggestInternalLinks(projectId);

          case "generateContentBriefs":
            return generateContentBriefs(projectId);

          case "runSiteAudit":
            return runSiteAudit(projectId);

          case "extractProjectEntities":
            return extractProjectEntities(projectId);

          case "generateInsights":
            return generateInsightsForProject(projectId);

          default:
            return { error: `Unknown action: ${action}` };
        }
      }
    );

    if ("error" in result) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(`[Mobile API] ${action} failed:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
