import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  // Try env var first, then DB
  let vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;

  if (!vapidKey) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "VAPID_PUBLIC_KEY")
        .single();
      vapidKey = data?.value ?? null;
    } catch {
      /* DB lookup failed */
    }
  }

  return NextResponse.json({ vapidKey });
}
