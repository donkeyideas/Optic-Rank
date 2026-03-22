import { createClient } from "@/lib/supabase/server";
import { getMFAStatus } from "@/lib/actions/two-fa";
import { redirect } from "next/navigation";
import { SecurityClient } from "./security-client";

export default async function AdminSecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { enabled, factors } = await getMFAStatus();

  return <SecurityClient mfaEnabled={enabled} mfaFactors={factors} />;
}
