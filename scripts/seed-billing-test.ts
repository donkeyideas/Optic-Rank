/**
 * Seed test billing events to see how revenue reporting works.
 * Run: npx tsx scripts/seed-billing-test.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Find the Kamioi org (active starter subscription)
  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, plan, subscription_status, stripe_customer_id, created_at");

  if (orgErr) {
    console.error("Failed to fetch orgs:", orgErr.message);
    return;
  }

  console.log("\n=== Organizations ===");
  for (const org of orgs ?? []) {
    console.log(`  ${org.name} | Plan: ${org.plan} | Status: ${org.subscription_status} | ID: ${org.id}`);
  }

  const kamioi = orgs?.find((o) => o.name.toLowerCase().includes("kamioi"));
  const testOrg = orgs?.find((o) => o.name.toLowerCase().includes("alain") || o.name.toLowerCase().includes("beltran"));

  if (!kamioi) {
    console.error("Could not find Kamioi org");
    return;
  }

  console.log(`\n=== Seeding billing events for: ${kamioi.name} (${kamioi.id}) ===`);

  // 2. Check existing billing events
  const { data: existing } = await supabase
    .from("billing_events")
    .select("id, event_type, amount_cents, created_at")
    .eq("organization_id", kamioi.id);

  console.log(`  Existing events: ${existing?.length ?? 0}`);

  // 3. Insert simulated invoice.paid events for past months
  const now = new Date();
  const events = [];

  // Simulate 3 months of payments ($29/mo = 2900 cents)
  for (let monthsAgo = 2; monthsAgo >= 0; monthsAgo--) {
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    events.push({
      organization_id: kamioi.id,
      stripe_event_id: `test_evt_invoice_paid_${date.toISOString().slice(0, 7)}`,
      event_type: "invoice.paid",
      amount_cents: 2900, // $29.00
      currency: "usd",
      metadata: { plan: "starter", test: true },
      created_at: date.toISOString(),
    });
  }

  // Also add the subscription.created event
  events.push({
    organization_id: kamioi.id,
    stripe_event_id: `test_evt_sub_created_${kamioi.id.slice(0, 8)}`,
    event_type: "customer.subscription.created",
    amount_cents: 2900,
    currency: "usd",
    metadata: { plan: "starter", test: true },
    created_at: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
  });

  const { data: inserted, error: insertErr } = await supabase
    .from("billing_events")
    .upsert(events, { onConflict: "stripe_event_id" })
    .select("id, event_type, amount_cents, created_at");

  if (insertErr) {
    console.error("Insert error:", insertErr.message);
    return;
  }

  console.log(`  Inserted/updated ${inserted?.length ?? 0} billing events:`);
  for (const ev of inserted ?? []) {
    console.log(`    ${ev.event_type} | $${(ev.amount_cents / 100).toFixed(2)} | ${ev.created_at}`);
  }

  // 4. Adjust the test org's trial to have expired (so we can see trial expiry behavior)
  if (testOrg) {
    console.log(`\n=== Adjusting trial for: ${testOrg.name} ===`);
    // Move trial end to 2 days ago to simulate expired trial
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 2);

    const { error: updateErr } = await supabase
      .from("organizations")
      .update({ trial_ends_at: expiredDate.toISOString() })
      .eq("id", testOrg.id);

    if (updateErr) {
      console.error("Update error:", updateErr.message);
    } else {
      console.log(`  Trial end moved to: ${expiredDate.toISOString()} (expired 2 days ago)`);
    }
  }

  // 5. Verify the results
  const { data: allEvents } = await supabase
    .from("billing_events")
    .select("event_type, amount_cents, created_at, organization_id")
    .order("created_at", { ascending: true });

  console.log(`\n=== All Billing Events (${allEvents?.length ?? 0}) ===`);
  let totalRevenue = 0;
  for (const ev of allEvents ?? []) {
    if (ev.event_type === "invoice.paid" && ev.amount_cents > 0) {
      totalRevenue += ev.amount_cents;
    }
    console.log(`  ${ev.created_at.slice(0, 10)} | ${ev.event_type} | $${(ev.amount_cents / 100).toFixed(2)}`);
  }
  console.log(`\n  Total Revenue: $${(totalRevenue / 100).toFixed(2)}`);
  console.log("  Done! Refresh the admin panel to see updated numbers.");
}

main().catch(console.error);
