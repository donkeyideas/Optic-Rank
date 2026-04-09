import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppleVerifier, planFromAppleProductId } from "@/lib/apple/server-api";

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const {
      data: { user },
    } = await client.auth.getUser();
    return user;
  }
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  return user;
}

/**
 * POST /api/iap/validate
 * Validates an Apple IAP transaction from the mobile app.
 * Body: { transactionId: string }
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { transactionId } = body;

  if (!transactionId) {
    return NextResponse.json(
      { error: "transactionId is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    // Get user's organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    // Verify the transaction with Apple
    const verifier = getAppleVerifier();
    const transaction =
      await verifier.verifyAndDecodeTransaction(transactionId);

    if (!transaction.productId || !transaction.originalTransactionId) {
      return NextResponse.json(
        { error: "Invalid transaction data" },
        { status: 400 }
      );
    }

    // Map Apple product to plan + limits
    const { planKey, limits } = await planFromAppleProductId(
      transaction.productId
    );

    // Update organization
    await supabase
      .from("organizations")
      .update({
        plan: planKey,
        subscription_status: "active",
        billing_provider: "apple",
        apple_original_transaction_id: transaction.originalTransactionId,
        apple_subscription_expires_at: transaction.expiresDate
          ? new Date(transaction.expiresDate).toISOString()
          : null,
        trial_ends_at: null,
        max_projects: limits.maxProjects,
        max_keywords: limits.maxKeywords,
        max_pages_crawl: limits.maxPagesCrawl,
        max_users: limits.maxUsers,
      })
      .eq("id", profile.organization_id);

    // Log billing event
    await supabase.from("billing_events").insert({
      organization_id: profile.organization_id,
      event_type: "iap.purchase",
      billing_source: "apple",
      amount_cents: transaction.price ?? null,
      currency: transaction.currency ?? "USD",
      metadata: {
        product_id: transaction.productId,
        transaction_id: transaction.transactionId,
        original_transaction_id: transaction.originalTransactionId,
      },
    });

    console.log(
      `[IAP Validate] Success — org ${profile.organization_id} → ${planKey} via ${transaction.productId}`
    );

    return NextResponse.json({ success: true, plan: planKey });
  } catch (err) {
    console.error("[IAP Validate] Error:", err);
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
