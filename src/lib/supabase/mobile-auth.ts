import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "./admin";

/**
 * Authenticate a mobile request using Bearer token.
 * Returns the verified user or null.
 */
export async function authenticateMobileRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Verify that a user has access to a project (via their organization).
 */
export async function verifyProjectAccess(
  userId: string,
  projectId: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  if (!profile?.organization_id) return false;

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organization_id", profile.organization_id)
    .single();

  return !!project;
}
