import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, requireScope, corsHeaders, handleOptions, type ApiAuth } from "@/lib/api/v1/middleware";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if ("error" in auth) return auth.error;

  const scopeErr = requireScope(auth as ApiAuth, "backlinks:read");
  if (scopeErr) return scopeErr;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const supabase = createAdminClient();

  if (!projectId) {
    return NextResponse.json({ error: "project_id is required." }, { status: 400, headers: corsHeaders() });
  }

  // Verify ownership
  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organization_id", (auth as ApiAuth).orgId)
    .single();

  if (!proj) {
    return NextResponse.json({ error: "Project not found." }, { status: 404, headers: corsHeaders() });
  }

  const { data, count, error } = await supabase
    .from("backlinks")
    .select("id, source_url, target_url, anchor_text, trust_flow, citation_flow, link_type, is_toxic, first_seen, last_seen, status", { count: "exact" })
    .eq("project_id", projectId)
    .order("trust_flow", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0 }, { headers: corsHeaders() });
}
