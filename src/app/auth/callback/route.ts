import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // If Supabase returned an error instead of a code, pass it to the login page
  const errorParam = searchParams.get("error_description") || searchParams.get("error");
  if (errorParam && !code) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent(errorParam)}`
    );
  }

  if (code) {
    const cookieStore = await cookies();

    // Create the redirect response FIRST so we can set cookies on it directly.
    // This is critical — using cookies() + a separate NextResponse.redirect()
    // can cause auth cookies to be lost.
    const redirectUrl = `${origin}${next}`;
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Set cookies on the redirect response so they travel with it
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure OAuth users have an organization (email/password users get one in signUp action)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const admin = createAdminClient();

          // Wait briefly for the handle_new_user trigger to create the profile
          let profile: { organization_id: string | null; full_name: string | null } | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const { data } = await admin
              .from("profiles")
              .select("organization_id, full_name")
              .eq("id", user.id)
              .single();
            if (data) {
              profile = data;
              break;
            }
            // Profile not yet created by trigger — wait and retry
            await new Promise((r) => setTimeout(r, 300));
          }

          // If profile still doesn't exist, create it manually
          if (!profile) {
            const userName =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "User";

            await admin.from("profiles").insert({
              id: user.id,
              full_name: userName,
              avatar_url: user.user_metadata?.avatar_url || null,
            });

            profile = { organization_id: null, full_name: userName };
          }

          // If profile exists but has no organization, set one up
          if (profile && !profile.organization_id) {
            let linkedOrgId: string | null = null;

            // Check if another profile with the same email already has an org
            // (handles users signing in with a second OAuth provider)
            if (user.email) {
              const { data: authUsers } = await admin.auth.admin.listUsers({
                perPage: 1000,
              });
              const matchingUserIds = (authUsers?.users ?? [])
                .filter((u) => u.email === user.email && u.id !== user.id)
                .map((u) => u.id);

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
                  await admin
                    .from("profiles")
                    .update({
                      organization_id: linkedOrgId,
                      role: existingProfile.role ?? "member",
                      full_name:
                        profile.full_name || existingProfile.full_name,
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

      return response;
    }
  }

  return NextResponse.redirect(
    `${origin}/login?message=Could not authenticate`
  );
}
