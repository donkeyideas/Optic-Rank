"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Get current MFA status for the authenticated user.
 */
export async function getMFAStatus(): Promise<{
  enabled: boolean;
  factors: Array<{ id: string; friendlyName: string | null; status: string }>;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { enabled: false, factors: [] };

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return { enabled: false, factors: [] };

  const totpFactors = data.totp.map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
    status: f.status,
  }));

  const enabled = totpFactors.some((f) => f.status === "verified");
  return { enabled, factors: totpFactors };
}

/**
 * Start TOTP enrollment — generates a secret and QR code URI.
 * User must verify with a code before the factor becomes active.
 */
export async function enrollTOTP(): Promise<
  { factorId: string; qrCode: string; secret: string; uri: string } | { error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Google Authenticator",
  });

  if (error) return { error: error.message };

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/**
 * Verify and activate a TOTP factor. This is called during setup
 * when the user enters their first 6-digit code.
 */
export async function verifyAndActivateTOTP(
  factorId: string,
  code: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!/^\d{6}$/.test(code)) {
    return { error: "Please enter a valid 6-digit code." };
  }

  // Create a challenge for this factor
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });

  if (challengeError) return { error: challengeError.message };

  // Verify the code against the challenge
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) return { error: verifyError.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Verify TOTP code during login (elevates session from AAL1 to AAL2).
 */
export async function verifyTOTPLogin(
  code: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!/^\d{6}$/.test(code)) {
    return { error: "Please enter a valid 6-digit code." };
  }

  // Get the verified TOTP factor
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totpFactor = factors?.totp.find((f) => f.status === "verified");

  if (!totpFactor) {
    return { error: "No verified TOTP factor found." };
  }

  // Challenge + verify
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  });

  if (challengeError) return { error: challengeError.message };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) return { error: "Invalid code. Please try again." };

  return { success: true };
}

/**
 * Remove a TOTP factor (disable 2FA).
 */
export async function unenrollTOTP(
  factorId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}
