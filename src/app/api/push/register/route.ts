import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthUser(request: NextRequest) {
  // Check for mobile Bearer token first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await client.auth.getUser();
    return user;
  }
  // Fall back to cookie-based auth (web)
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  console.log("[Push Register] POST received");
  const user = await getAuthUser(request);
  if (!user) {
    console.log("[Push Register] Unauthorized — no user from auth");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { token, subscription, device, userAgent } = body;
  console.log(`[Push Register] User ${user.id.slice(0, 8)}... | device=${device} | hasToken=${!!token} | hasSub=${!!subscription}`);

  if (!token && !subscription) {
    return NextResponse.json(
      { error: "Token or subscription required" },
      { status: 400 }
    );
  }

  const tokenValue = subscription ? JSON.stringify(subscription) : token;
  const supabase = createAdminClient();

  // For Web Push: clean up old subscriptions with same endpoint
  if (subscription) {
    const { data: existing } = await supabase
      .from("push_tokens")
      .select("id, token")
      .eq("user_id", user.id);

    const toDelete = (existing ?? []).filter((t) => {
      try {
        return JSON.parse(t.token).endpoint === subscription.endpoint;
      } catch {
        return false;
      }
    });

    if (toDelete.length > 0) {
      await supabase
        .from("push_tokens")
        .delete()
        .in(
          "id",
          toDelete.map((t) => t.id)
        );
    }
  }

  // Upsert token
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: user.id,
      token: tokenValue,
      device_type: device ?? "web",
      user_agent: userAgent ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );

  if (error) {
    console.error("[Push Register] Upsert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log(`[Push Register] Success — ${subscription ? "Web Push" : "FCM"} token stored for user ${user.id.slice(0, 8)}...`);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const supabase = createAdminClient();

  if (token) {
    await supabase
      .from("push_tokens")
      .delete()
      .eq("token", token)
      .eq("user_id", user.id);
  } else {
    await supabase.from("push_tokens").delete().eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}
