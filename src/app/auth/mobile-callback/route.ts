import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const appUrl = searchParams.get("app_url");

  if (!code) {
    return new Response("Missing authentication code.", { status: 400 });
  }

  // Validate app_url scheme (only allow opticrank:// or exp://)
  const safeAppUrl =
    appUrl && (appUrl.startsWith("opticrank://") || appUrl.startsWith("exp://"))
      ? appUrl
      : "opticrank://auth/callback";

  // Exchange code for session
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return htmlResponse(
      "Authentication Failed",
      `<p>${error.message}</p><p>Please close this window and try again.</p>`
    );
  }

  // Get session tokens to pass to the mobile app
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return htmlResponse(
      "Session Error",
      "<p>Could not retrieve session. Please close this window and try again.</p>"
    );
  }

  // Create organization for OAuth users (same as regular callback)
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

      if (profile && !profile.organization_id) {
        let linkedOrgId: string | null = null;

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
    // Non-critical
  }

  // Build the redirect URL with tokens in the hash fragment
  const tokenFragment = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: "bearer",
    expires_in: String(session.expires_in),
  }).toString();

  const redirectUrl = `${safeAppUrl}#${tokenFragment}`;

  // Return HTML page that redirects to the mobile app
  return htmlResponse(
    "Signed In",
    `
    <p>Authentication successful! Redirecting to Optic Rank...</p>
    <script>
      window.location.replace(${JSON.stringify(redirectUrl)});
      setTimeout(function() {
        document.getElementById('fallback').style.display = 'block';
      }, 3000);
    </script>
    <div id="fallback" style="display: none; margin-top: 24px;">
      <p>If you were not redirected automatically:</p>
      <a href="${encodeURI(redirectUrl)}" style="display: inline-block; padding: 12px 24px; background: #c0392b; color: white; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        RETURN TO APP
      </a>
    </div>
    `
  );
}

function htmlResponse(title: string, body: string) {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Optic Rank</title>
  <style>
    body { font-family: 'IBM Plex Sans', sans-serif; text-align: center; padding: 60px 20px; background: #f5f2ed; color: #1a1a1a; }
    h2 { font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h2>${title}</h2>
  ${body}
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
