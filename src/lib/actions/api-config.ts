"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

/**
 * Save/update an API configuration (key, secret, base_url, is_active).
 */
export async function saveAPIConfig(
  configId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const apiKey = (formData.get("api_key") as string) ?? "";
  const apiSecret = (formData.get("api_secret") as string) ?? "";
  const baseUrl = (formData.get("base_url") as string) ?? "";
  const isActive = formData.get("is_active") === "true";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("platform_api_configs")
    .update({
      api_key: apiKey || null,
      api_secret: apiSecret || null,
      base_url: baseUrl || null,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", configId);

  if (error) return { error: error.message };

  revalidatePath("/admin/api");
  return { success: true };
}

/**
 * Test an API connection by provider type.
 */
export async function testAPIConnection(
  configId: string
): Promise<{ error: string } | { success: true; message: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();

  // Get the config
  const { data: config } = await supabase
    .from("platform_api_configs")
    .select("*")
    .eq("id", configId)
    .single();

  if (!config) return { error: "API configuration not found." };
  if (!config.api_key) return { error: "No API key configured." };

  let testResult: { ok: boolean; message: string };

  try {
    switch (config.provider) {
      case "pagespeed":
        testResult = await testPageSpeed(config.api_key);
        break;
      case "gemini":
        testResult = await testGemini(config.api_key);
        break;
      case "dataforseo":
        testResult = await testDataForSEO(config.api_key, config.api_secret);
        break;
      case "openai":
        testResult = await testOpenAI(config.api_key);
        break;
      case "anthropic":
        testResult = await testAnthropic(config.api_key);
        break;
      case "deepseek":
        testResult = await testDeepSeek(config.api_key);
        break;
      case "stripe":
        testResult = await testStripe(config.api_key);
        break;
      default:
        testResult = { ok: true, message: `API key saved for ${config.display_name}. Manual verification recommended.` };
    }
  } catch (err) {
    testResult = {
      ok: false,
      message: err instanceof Error ? err.message : "Connection test failed.",
    };
  }

  // Update test status
  await supabase
    .from("platform_api_configs")
    .update({
      last_tested_at: new Date().toISOString(),
      test_status: testResult.ok ? "success" : "failed",
    })
    .eq("id", configId);

  revalidatePath("/admin/api");

  if (!testResult.ok) return { error: testResult.message };
  return { success: true, message: testResult.message };
}

/**
 * Toggle an API config active/inactive.
 */
export async function toggleAPIConfig(
  configId: string,
  isActive: boolean
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("platform_api_configs")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", configId);

  if (error) return { error: error.message };

  revalidatePath("/admin/api");
  return { success: true };
}

// ─── Test Helpers ────────────────────────────────────────────────────────

async function testPageSpeed(apiKey: string) {
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&key=${apiKey}&strategy=mobile&category=performance`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PageSpeed API returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return { ok: true, message: "PageSpeed API key is valid." };
}

async function testGemini(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Say hello" }] }],
      generationConfig: { maxOutputTokens: 10 },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return { ok: true, message: "Gemini API key is valid." };
}

async function testDataForSEO(apiKey: string, apiSecret: string | null) {
  if (!apiSecret) throw new Error("DataForSEO requires both login (api_key) and password (api_secret).");
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ keyword: "test", location_code: 2840, language_code: "en", depth: 1 }]),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`DataForSEO returned ${res.status}`);
  }
  const data = await res.json();
  if (data.status_code !== 20000) {
    throw new Error(data.status_message ?? "DataForSEO returned an error.");
  }
  return { ok: true, message: "DataForSEO credentials are valid." };
}

async function testOpenAI(apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`OpenAI API returned ${res.status}`);
  }
  return { ok: true, message: "OpenAI API key is valid." };
}

async function testAnthropic(apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "Hi" }],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return { ok: true, message: "Anthropic API key is valid." };
}

async function testDeepSeek(apiKey: string) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 10,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek API returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return { ok: true, message: "DeepSeek API key is valid." };
}

async function testStripe(apiKey: string) {
  const res = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stripe API returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return { ok: true, message: "Stripe API key is valid. Balance retrieved successfully." };
}
