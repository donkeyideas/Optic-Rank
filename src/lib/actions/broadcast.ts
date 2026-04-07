"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAll } from "@/lib/notifications/push";
import { aiChat } from "@/lib/ai/ai-provider";
import { revalidatePath } from "next/cache";

async function verifyAdmin(): Promise<string | null> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return null;

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (
    profile?.system_role !== "superadmin" &&
    profile?.system_role !== "admin"
  ) {
    return null;
  }

  return user.id;
}

/* ---------- Send Broadcast ---------- */

export async function sendBroadcast(
  title: string,
  message: string,
  actionUrl?: string
): Promise<
  | { error: string }
  | {
      success: true;
      diagnostics: {
        usersNotified: number;
        pushDelivered: number;
        pushFailed: number;
      };
    }
> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "Unauthorized" };

  if (!title?.trim() || !message?.trim()) {
    return { error: "Title and message are required" };
  }

  const supabase = createAdminClient();

  // Get all users
  const { data: users } = await supabase
    .from("profiles")
    .select("id");

  if (!users || users.length === 0) {
    return { error: "No users found" };
  }

  // Create in-app notifications for all users (batch)
  const notificationRows = users.map((u) => ({
    user_id: u.id,
    type: "system.broadcast",
    title: title.trim(),
    message: message.trim(),
    action_url: actionUrl?.trim() || null,
    is_read: false,
  }));

  // Supabase insert supports batching
  const { error: insertError } = await supabase
    .from("notifications")
    .insert(notificationRows);

  if (insertError) {
    console.error("Failed to insert broadcast notifications:", insertError);
    return { error: "Failed to create notifications" };
  }

  // Send push notifications to all users
  let pushDelivered = 0;
  let pushFailed = 0;

  try {
    const pushResult = await sendPushToAll({
      title: title.trim(),
      message: message.trim(),
      type: "system.announcement",
      actionUrl: actionUrl?.trim() || undefined,
      sentBy: adminId,
    });
    pushDelivered = pushResult.success;
    pushFailed = pushResult.failed;
  } catch (err) {
    console.error("Push notification failed:", err);
  }

  revalidatePath("/admin/notifications");
  return {
    success: true,
    diagnostics: {
      usersNotified: users.length,
      pushDelivered,
      pushFailed,
    },
  };
}

/* ---------- Get Broadcast History ---------- */

export interface BroadcastHistoryEntry {
  title: string;
  message: string;
  createdAt: string;
  recipients: number;
  readCount: number;
}

export async function getBroadcastHistory(): Promise<BroadcastHistoryEntry[]> {
  const adminId = await verifyAdmin();
  if (!adminId) return [];

  const supabase = createAdminClient();

  // Get all broadcast notifications, ordered by most recent
  const { data: broadcasts } = await supabase
    .from("notifications")
    .select("title, message, created_at, is_read")
    .eq("type", "system.broadcast")
    .order("created_at", { ascending: false })
    .limit(5000); // enough to cover history

  if (!broadcasts || broadcasts.length === 0) return [];

  // Group by title+message to get distinct broadcasts
  const groups = new Map<
    string,
    { title: string; message: string; createdAt: string; total: number; readCount: number }
  >();

  for (const b of broadcasts) {
    const key = `${b.title}||${b.message}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        title: b.title,
        message: b.message ?? "",
        createdAt: b.created_at,
        total: 1,
        readCount: b.is_read ? 1 : 0,
      });
    } else {
      existing.total += 1;
      if (b.is_read) existing.readCount += 1;
    }
  }

  // Convert to array, sorted by most recent
  return Array.from(groups.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20)
    .map((g) => ({
      title: g.title,
      message: g.message,
      createdAt: g.createdAt,
      recipients: g.total,
      readCount: g.readCount,
    }));
}

/* ---------- AI Generate Broadcast ---------- */

export async function generateBroadcastContent(): Promise<
  | { error: string }
  | { title: string; body: string }
> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "Unauthorized" };

  // Get previous broadcast titles to avoid repeats
  const history = await getBroadcastHistory();
  const previousList = history
    .slice(0, 20)
    .map((b, i) => `${i + 1}. "${b.title}" - ${b.message.slice(0, 80)}`)
    .join("\n");

  const prompt = `You are a community manager for Optic Rank, an AI-powered SEO intelligence platform that helps businesses track keywords, monitor rankings, analyze competitors, audit websites, and optimize their online presence.

Generate a short, engaging system broadcast notification to keep users active and informed.

Rules:
- Title: 5-10 words max, catchy and direct
- Body: 1-2 sentences max, 20-40 words
- Tone: professional but energetic — like a product manager sharing exciting updates
- Never use markdown formatting (no **, --, ###, *, etc.)
- Never use emojis
- Mix up topics: new features, SEO tips, ranking updates, industry insights, platform improvements, motivation
- Each broadcast must be completely unique and different from previous ones

${previousList ? `Here are the previous broadcasts (DO NOT repeat any of these themes or phrasings):\n${previousList}\n\nGenerate a completely new and different broadcast.` : "Generate an engaging broadcast for our SEO platform users."}

Return ONLY valid JSON: {"title": "...", "body": "..."}`;

  const result = await aiChat(prompt, {
    temperature: 1.0,
    maxTokens: 200,
    jsonMode: true,
    context: {
      feature: "broadcast_generator",
      user_id: adminId,
    },
  });

  if (!result?.text) {
    return { error: "AI generation failed — no provider available" };
  }

  // Parse JSON response
  let title = "";
  let body = "";
  try {
    const parsed = JSON.parse(result.text);
    title = parsed.title || "";
    body = parsed.body || "";
  } catch {
    // Try to extract from non-JSON response
    const titleMatch = result.text.match(/"title"\s*:\s*"([^"]+)"/);
    const bodyMatch = result.text.match(/"body"\s*:\s*"([^"]+)"/);
    title = titleMatch?.[1] || "Platform Update";
    body =
      bodyMatch?.[1] ||
      "Check out the latest improvements to your SEO intelligence dashboard.";
  }

  // Clean up any markdown artifacts
  title = title.replace(/[*#_~`>-]{2,}/g, "").trim();
  body = body.replace(/[*#_~`>-]{2,}/g, "").trim();

  return { title, body };
}
