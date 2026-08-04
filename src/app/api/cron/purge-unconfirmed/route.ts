import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Cron endpoint: delete never-confirmed accounts older than 24h.
 *
 * Spam signups create a profile + org immediately but never confirm their
 * email. This removes their payoff and keeps the user/org tables clean.
 * Deleting the auth user cascades to profiles; orphaned orgs are cleaned up.
 * Also prunes old signup_attempts rows used by the rate limiter.
 *
 * Runs daily. Protected by CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const cutoff = Date.now() - 24 * 60 * 60_000; // 24h ago
  let deletedUsers = 0;
  let deletedOrgs = 0;

  // Page through auth users and delete unconfirmed ones older than the cutoff.
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      const createdMs = user.created_at ? new Date(user.created_at).getTime() : 0;
      const isConfirmed = Boolean(
        user.email_confirmed_at || user.confirmed_at
      );
      // Never signed in and never confirmed and past the grace window.
      if (isConfirmed || createdMs > cutoff) continue;

      // Grab org before deleting so we can clean up if it's orphaned.
      const { data: profile } = await admin
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
      if (delErr) continue;
      deletedUsers++;

      if (profile?.organization_id) {
        const { count } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", profile.organization_id);
        if ((count ?? 0) === 0) {
          await admin
            .from("organizations")
            .delete()
            .eq("id", profile.organization_id);
          deletedOrgs++;
        }
      }
    }

    if (data.users.length < 200) break; // last page
  }

  // Housekeeping: prune signup_attempts older than 7 days.
  await admin
    .from("signup_attempts")
    .delete()
    .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString());

  return NextResponse.json({ deletedUsers, deletedOrgs });
}
