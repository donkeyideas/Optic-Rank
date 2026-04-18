"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email/resend";

/* ------------------------------------------------------------------
   User-facing support actions
   ------------------------------------------------------------------ */

export async function getUserTickets() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("contact_submissions")
    .select("id, name, email, subject, message, status, category, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!tickets) return [];

  // Get reply counts per ticket
  const ticketIds = tickets.map((t) => t.id);
  if (ticketIds.length === 0) return tickets.map((t) => ({ ...t, replyCount: 0 }));

  const { data: replies } = await admin
    .from("support_replies")
    .select("ticket_id")
    .in("ticket_id", ticketIds);

  const countMap = new Map<string, number>();
  for (const r of replies ?? []) {
    countMap.set(r.ticket_id, (countMap.get(r.ticket_id) ?? 0) + 1);
  }

  return tickets.map((t) => ({ ...t, replyCount: countMap.get(t.id) ?? 0 }));
}

export async function createSupportTicket(
  subject: string,
  message: string,
  category: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!subject?.trim() || !message?.trim()) {
    return { error: "Subject and message are required." };
  }

  const admin = createAdminClient();

  // Get user profile for name
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { error } = await admin
    .from("contact_submissions")
    .insert({
      user_id: user.id,
      name: profile?.full_name || user.email?.split("@")[0] || "User",
      email: user.email!,
      subject: subject.trim(),
      message: message.trim(),
      category: category || "general",
      status: "new",
    });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function getTicketWithReplies(ticketId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  // Get ticket (verify ownership)
  const { data: ticket } = await admin
    .from("contact_submissions")
    .select("*")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .single();

  if (!ticket) return null;

  // Get replies
  const { data: replies } = await admin
    .from("support_replies")
    .select("id, sender_role, message, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return { ...ticket, replies: replies ?? [] };
}

export async function addReplyToTicket(
  ticketId: string,
  message: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!message?.trim()) return { error: "Message is required." };

  const admin = createAdminClient();

  // Verify ticket ownership
  const { data: ticket } = await admin
    .from("contact_submissions")
    .select("id")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .single();

  if (!ticket) return { error: "Ticket not found." };

  const { error } = await admin
    .from("support_replies")
    .insert({
      ticket_id: ticketId,
      sender_role: "user",
      sender_id: user.id,
      message: message.trim(),
    });

  if (error) return { error: error.message };

  // Update ticket status back to "new" so admin knows there's a new message
  await admin
    .from("contact_submissions")
    .update({ status: "new" })
    .eq("id", ticketId);

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/* ------------------------------------------------------------------
   Admin-facing support actions
   ------------------------------------------------------------------ */

export async function adminReplyToTicket(
  ticketId: string,
  message: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Verify admin role
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (profile?.system_role !== "superadmin" && profile?.system_role !== "admin") {
    return { error: "Unauthorized." };
  }

  if (!message?.trim()) return { error: "Message is required." };

  // Get ticket info for notification email
  const { data: ticket } = await admin
    .from("contact_submissions")
    .select("email, subject, user_id")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found." };

  // Insert reply
  const { error } = await admin
    .from("support_replies")
    .insert({
      ticket_id: ticketId,
      sender_role: "admin",
      sender_id: user.id,
      message: message.trim(),
    });

  if (error) return { error: error.message };

  // Update ticket status
  await admin
    .from("contact_submissions")
    .update({ status: "replied" })
    .eq("id", ticketId);

  // Send notification email to user
  if (ticket.email) {
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Reply to Your Support Ticket</h2>
        <p style="color: #666;">Re: <strong>${ticket.subject || "Support Request"}</strong></p>
        <div style="background: #f5f2ed; padding: 16px; border-left: 3px solid #c0392b; margin: 16px 0;">
          <p style="margin: 0; color: #1a1a1a; white-space: pre-wrap;">${message.trim()}</p>
        </div>
        <p style="color: #666; font-size: 14px;">
          You can view the full conversation in your
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=support" style="color: #c0392b;">account settings</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Optic Rank Support Team</p>
      </div>
    `;

    sendEmail(
      ticket.email,
      `Re: ${ticket.subject || "Support Request"} — Optic Rank`,
      emailHtml,
      { userId: ticket.user_id ?? undefined, emailType: "support_reply" }
    ).catch((err) => {
      console.error("[Support] Failed to send reply notification:", err);
    });
  }

  // Create in-app notification for the user
  if (ticket.user_id) {
    admin
      .from("notifications")
      .insert({
        user_id: ticket.user_id,
        type: "support.reply",
        title: "New reply to your support ticket",
        message: `Re: ${ticket.subject || "Support Request"} — ${message.trim().slice(0, 120)}`,
        action_url: "/dashboard/settings?tab=support",
        is_read: false,
      })
      .then(() => {})
      .catch((err: unknown) => {
        console.error("[Support] Failed to create in-app notification:", err);
      });
  }

  revalidatePath("/admin/contacts");
  return { success: true };
}

export async function getTicketReplies(ticketId: string) {
  const admin = createAdminClient();
  const { data: replies } = await admin
    .from("support_replies")
    .select("id, sender_role, sender_id, message, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return replies ?? [];
}

/* ------------------------------------------------------------------
   User notification helpers
   ------------------------------------------------------------------ */

export async function getUserUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const admin = createAdminClient();
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return count ?? 0;
}

export async function getUserNotifications(limit = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("notifications")
    .select("id, type, title, message, action_url, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function markNotificationsRead(ids: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ is_read: true })
    .in("id", ids)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/dashboard");
}
