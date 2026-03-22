import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Verify2FAForm } from "./verify-2fa-form";

export default async function Verify2FAPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Must be authenticated (at AAL1) to reach this page
  if (!user) redirect("/login");

  // Check if user actually needs 2FA verification
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // If already at AAL2 or no TOTP factors, go to dashboard
  if (
    !aalData ||
    aalData.currentLevel === "aal2" ||
    aalData.nextLevel !== "aal2"
  ) {
    redirect("/dashboard");
  }

  return <Verify2FAForm />;
}
