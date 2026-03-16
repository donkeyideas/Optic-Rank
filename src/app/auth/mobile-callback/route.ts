import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const appUrl = searchParams.get("app_url");

  // Validate app_url scheme (only allow opticrank:// or exp://)
  const safeAppUrl =
    appUrl &&
    (appUrl.startsWith("opticrank://") || appUrl.startsWith("exp://"))
      ? appUrl
      : "opticrank://auth/callback";

  // If there's a code param (PKCE flow), exchange it server-side
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return htmlPage(
        "Authentication Failed",
        `<p>${error.message}</p><p>Please close this window and try again.</p>`
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return htmlPage(
        "Session Error",
        "<p>Could not retrieve session. Please close this window and try again.</p>"
      );
    }

    // Handle org creation for OAuth users
    await ensureOrganization(supabase);

    // Redirect to mobile app with tokens
    const tokenFragment = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      token_type: "bearer",
      expires_in: String(session.expires_in),
    }).toString();

    return redirectPage(safeAppUrl, tokenFragment);
  }

  // No code param — implicit flow sends tokens in the hash fragment.
  // Hash fragments are invisible to the server, so return an HTML page
  // that reads them client-side and redirects to the mobile app.
  return htmlPage(
    "Signing In...",
    `
    <p>Processing authentication...</p>
    <script>
      (function() {
        var hash = window.location.hash.substring(1);
        if (!hash) {
          document.body.innerHTML = '<h2>Authentication Failed</h2><p>No authentication data received. Please close this window and try again.</p>';
          return;
        }

        var params = new URLSearchParams(hash);
        var accessToken = params.get('access_token');
        var refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          var appUrl = ${JSON.stringify(safeAppUrl)};
          var redirectUrl = appUrl + '#' + hash;
          document.querySelector('p').textContent = 'Authentication successful! Redirecting to Optic Rank...';
          window.location.replace(redirectUrl);

          setTimeout(function() {
            document.getElementById('fallback').style.display = 'block';
          }, 3000);
        } else {
          document.body.innerHTML = '<h2>Authentication Failed</h2><p>Invalid authentication data. Please close this window and try again.</p>';
        }
      })();
    </script>
    <div id="fallback" style="display: none; margin-top: 24px;">
      <p>If you were not redirected automatically:</p>
      <button onclick="window.location.replace(${JSON.stringify(safeAppUrl)} + '#' + window.location.hash.substring(1))" style="padding: 12px 24px; background: #c0392b; color: white; border: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;">
        RETURN TO APP
      </button>
    </div>
    `
  );
}

async function ensureOrganization(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("organization_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.organization_id) return;

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
              full_name: profile.full_name || existingProfile.full_name,
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
  } catch {
    // Non-critical
  }
}

function redirectPage(appUrl: string, tokenFragment: string) {
  const redirectUrl = `${appUrl}#${tokenFragment}`;
  return htmlPage(
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

function htmlPage(title: string, body: string) {
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
