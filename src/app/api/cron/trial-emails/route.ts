import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { trialExpiringEmail, trialExpiredEmail } from "@/lib/email/templates/trial";

export const maxDuration = 30;

/**
 * Cron endpoint: send trial-expiring and trial-expired emails.
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

  const supabase = createAdminClient();
  let sent = 0;

  // Find all trialing organizations
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, trial_ends_at, subscription_status, metadata")
    .eq("subscription_status", "trialing")
    .not("trial_ends_at", "is", null);

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ sent: 0, message: "No trialing orgs" });
  }

  const now = new Date();

  for (const org of orgs) {
    const trialEnd = new Date(org.trial_ends_at);
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const meta = (org.metadata as Record<string, unknown>) ?? {};

    // Get the org owner's email and name
    const { data: owner } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", org.id)
      .eq("role", "owner")
      .limit(1)
      .single();

    if (!owner) continue;

    const { data: authUser } = await supabase.auth.admin.getUserById(owner.id);
    const email = authUser?.user?.email;
    if (!email) continue;

    const ownerName = owner.full_name ?? email.split("@")[0];

    try {
      // Trial expiring in 3 days
      if (daysLeft === 3 && !meta.trial_expiring_sent) {
        await sendEmail(
          email,
          `Your trial ends in 3 days — Optic Rank`,
          trialExpiringEmail(ownerName, 3),
          { userId: owner.id, emailType: "trial_warning" }
        );
        await supabase
          .from("organizations")
          .update({ metadata: { ...meta, trial_expiring_sent: true } })
          .eq("id", org.id);
        sent++;

        // Push notification: trial expiring
        try {
          const { sendPushToUser } = await import("@/lib/notifications/push");
          await sendPushToUser(owner.id, {
            title: "Your trial ends in 3 days",
            message: "Upgrade to keep your SEO data and continue tracking.",
            type: "trial.expiring",
            actionUrl: "/dashboard/settings?tab=billing",
          });
        } catch { /* push is best-effort */ }
      }

      // Trial expired
      if (daysLeft <= 0 && !meta.trial_expired_sent) {
        await sendEmail(
          email,
          `Your free trial has ended — Optic Rank`,
          trialExpiredEmail(ownerName),
          { userId: owner.id, emailType: "trial_expired" }
        );
        await supabase
          .from("organizations")
          .update({ metadata: { ...meta, trial_expired_sent: true } })
          .eq("id", org.id);
        sent++;

        // Push notification: trial expired
        try {
          const { sendPushToUser } = await import("@/lib/notifications/push");
          await sendPushToUser(owner.id, {
            title: "Your free trial has ended",
            message: "Upgrade now to continue using Optic Rank.",
            type: "trial.expiring",
            actionUrl: "/dashboard/settings?tab=billing",
          });
        } catch { /* push is best-effort */ }
      }
    } catch (err) {
      console.error(`[trial-emails] Error for org ${org.id}:`, err);
    }
  }

  return NextResponse.json({ sent, total: orgs.length });
}
