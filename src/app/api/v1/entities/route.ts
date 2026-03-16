import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, requireScope, corsHeaders, handleOptions, type ApiAuth } from "@/lib/api/v1/middleware";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if ("error" in auth) return auth.error;

  const scopeErr = requireScope(auth as ApiAuth, "entities:read");
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

  const { data, error } = await supabase
    .from("entity_tracking")
    .select("id, entity_name, entity_type, knowledge_panel_present, avg_sentiment, mention_count, sources, checked_at")
    .eq("project_id", projectId)
    .order("checked_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }

  return NextResponse.json({ data: data ?? [] }, { headers: corsHeaders() });
}
