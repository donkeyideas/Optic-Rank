import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, requireScope, corsHeaders, handleOptions, type ApiAuth } from "@/lib/api/v1/middleware";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if ("error" in auth) return auth.error;

  const scopeErr = requireScope(auth as ApiAuth, "projects:read");
  if (scopeErr) return scopeErr;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, domain, url, type, is_active, created_at")
    .eq("organization_id", (auth as ApiAuth).orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }

  return NextResponse.json({ data: data ?? [] }, { headers: corsHeaders() });
}
