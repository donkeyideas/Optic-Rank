import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if the user needs an organization (OAuth users don't get one auto-created)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const admin = createAdminClient();
          const { data: profile } = await admin
            .from("profiles")
            .select("organization_id, full_name")
            .eq("id", user.id)
            .single();

          // If profile exists but has no organization, check for existing account with same email
          if (profile && !profile.organization_id) {
            let linkedOrgId: string | null = null;

            // Check if another profile with the same email already has an org
            // This handles the case where a user signs in with a second OAuth provider
            if (user.email) {
              const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
              const matchingUserIds = (authUsers?.users ?? [])
                .filter(u => u.email === user.email && u.id !== user.id)
                .map(u => u.id);

              if (matchingUserIds.length > 0) {
                const { data: existingProfile } = await admin
                  .from("profiles")
                  .select("organization_id, full_name, role")
                  .in("id", matchingUserIds)
                  .not("organization_id", "is", null)
                  .limit(1)
                  .single();

                if (existingProfile?.organization_id) {
                  linkedOrgId = existingProfile.organization_id;
                  // Link this profile to the existing org and copy the name if missing
                  await admin
                    .from("profiles")
                    .update({
                      organization_id: linkedOrgId,
                      role: existingProfile.role ?? "member",
                      full_name: profile.full_name || existingProfile.full_name,
                    })
                    .eq("id", user.id);
                }
              }
            }

            // No existing account found — create a new organization
            if (!linkedOrgId) {
              const userName =
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split("@")[0] ||
                "User";

              const slug = userName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

              // Create organization with 14-day trial
              const trialEndsAt = new Date();
              trialEndsAt.setDate(trialEndsAt.getDate() + 14);

              const { data: org } = await admin
                .from("organizations")
                .insert({
                  name: `${userName}'s Organization`,
                  slug: `${slug}-${Date.now().toString(36)}`,
                  plan: "free",
                  subscription_status: "trialing",
                  trial_ends_at: trialEndsAt.toISOString(),
                })
                .select("id")
                .single();

              if (org) {
                await admin
                  .from("profiles")
                  .update({ organization_id: org.id, role: "owner" })
                  .eq("id", user.id);
              }
            }
          }
        }
      } catch {
        // Non-critical — user can still create org from settings
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?message=Could not authenticate`
  );
}
