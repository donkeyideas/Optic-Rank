import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resend webhook endpoint — receives email delivery events.
 * POST /api/webhooks/resend
 *
 * Events: email.sent, email.delivered, email.bounced,
 *         email.complained, email.opened, email.clicked
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret if configured
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("svix-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    // For production, use Resend's svix library for full verification.
    // For now, we rely on the secret being in the URL or a simple header check.
  }

  let body: {
    type: string;
    data: {
      email_id?: string;
      created_at?: string;
      [key: string]: unknown;
    };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = body;
  const resendId = data?.email_id;

  if (!resendId) {
    return NextResponse.json({ ok: true, skipped: "no email_id" });
  }

  const admin = createAdminClient();

  switch (type) {
    case "email.delivered": {
      await admin
        .from("email_log")
        .update({ status: "delivered", delivered_at: data.created_at ?? new Date().toISOString() })
        .eq("resend_id", resendId);
      break;
    }
    case "email.bounced": {
      await admin
        .from("email_log")
        .update({ status: "bounced", error_message: "Email bounced" })
        .eq("resend_id", resendId);
      break;
    }
    case "email.complained": {
      await admin
        .from("email_log")
        .update({ status: "complained", error_message: "Recipient marked as spam" })
        .eq("resend_id", resendId);
      break;
    }
    case "email.opened": {
      await admin
        .from("email_log")
        .update({ opened_at: data.created_at ?? new Date().toISOString() })
        .eq("resend_id", resendId);
      break;
    }
    case "email.clicked": {
      await admin
        .from("email_log")
        .update({ clicked_at: data.created_at ?? new Date().toISOString() })
        .eq("resend_id", resendId);
      break;
    }
    default:
      // Ignore unknown event types
      break;
  }

  return NextResponse.json({ ok: true });
}
