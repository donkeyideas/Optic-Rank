import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, requireScope, corsHeaders, handleOptions, type ApiAuth } from "@/lib/api/v1/middleware";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if ("error" in auth) return auth.error;

  const scopeErr = requireScope(auth as ApiAuth, "predictions:read");
  if (scopeErr) return scopeErr;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  if (!projectId) {
    return NextResponse.json({ error: "project_id is required." }, { status: 400, headers: corsHeaders() });
  }

  const supabase = createAdminClient();

  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organization_id", (auth as ApiAuth).orgId)
    .single();

  if (!proj) {
    return NextResponse.json({ error: "Project not found." }, { status: 404, headers: corsHeaders() });
  }

  // rank_predictions is keyed by keyword_id, not project_id.
  // First get keyword IDs for this project, then fetch predictions.
  const { data: kwIds } = await supabase
    .from("keywords")
    .select("id")
    .eq("project_id", projectId);

  const keywordIds = (kwIds ?? []).map((k) => k.id);
  if (keywordIds.length === 0) {
    return NextResponse.json({ data: [] }, { headers: corsHeaders() });
  }

  const { data, error } = await supabase
    .from("rank_predictions")
    .select("id, keyword_id, predicted_position, confidence, prediction_date, actual_position, features_used, model_version, created_at")
    .in("keyword_id", keywordIds)
    .order("prediction_date", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }

  return NextResponse.json({ data: data ?? [] }, { headers: corsHeaders() });
}
