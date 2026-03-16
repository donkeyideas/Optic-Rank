# Stripe Integration Scope — SaaS Subscription Billing

Complete guide for integrating Stripe subscriptions with Next.js + Supabase.
Used in Optic Rank (RankPulse AI). Reusable across SaaS projects.

---

## Architecture Overview

```
User clicks Upgrade → Server creates Stripe Subscription (incomplete)
  → Returns PaymentIntent client_secret
  → Client renders Payment Element in custom modal
  → User completes payment via stripe.confirmPayment()
  → Client calls activateSubscription() server action (immediate)
  → Stripe webhook fires invoice.paid (backup/production)
  → Organization plan updated in database
```

---

## 1. Stripe Account Setup

### Products & Prices (Stripe Dashboard)
1. Create one **Product** per plan (Starter, Pro, Business)
2. Each product gets a **recurring monthly Price** ($29, $79, $199)
3. Copy the **Price IDs** (e.g., `price_1TBeuOKEIjPVNAaUnPZlREwg`)

### Webhook
1. Go to Developers → Webhooks → Add endpoint
2. URL: `https://yourdomain.com/api/webhooks/stripe`
3. Events to listen for:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing Secret** (`whsec_...`)

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
```

---

## 2. Dependencies

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

---

## 3. Key Files

### `lib/stripe/client.ts` — Server + Client Stripe instances
- `getStripe()` — Server-side Stripe instance (uses `STRIPE_SECRET_KEY`)
- `getStripePromise()` — Client-side loadStripe promise (uses publishable key)
- `PLAN_LIMITS` — Plan configuration with Stripe Price IDs + limits
- `planFromPriceId()` — Reverse lookup: Price ID → Plan name

### `lib/actions/billing.ts` — Server actions
- `createCheckoutSession(planId)` — Creates subscription with `payment_behavior: "default_incomplete"`, returns `clientSecret` + `subscriptionId`
- `activateSubscription(subscriptionId)` — Called after payment success, verifies subscription via Stripe API, updates org in DB
- `createPortalSession()` — Creates Stripe Customer Portal session for self-service management

### `app/api/webhooks/stripe/route.ts` — Webhook handler
Handles: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`

### `app/dashboard/settings/billing-tab.tsx` — Payment UI
Custom-styled payment modal using `@stripe/react-stripe-js` Elements + PaymentElement

---

## 4. Payment Flow (Step by Step)

### Step 1: Create Subscription (Server)
```typescript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: planConfig.stripePriceId }],
  payment_behavior: "default_incomplete",
  payment_settings: { save_default_payment_method: "on_subscription" },
  expand: ["latest_invoice"],
  metadata: { organization_id: org.id },
});
```

### Step 2: Get PaymentIntent client_secret
In Stripe API `2026-02-25.clover`, the PaymentIntent is accessed via `invoicePayments`:
```typescript
const payments = await stripe.invoicePayments.list({
  invoice: invoice.id,
  expand: ["data.payment.payment_intent"],
  limit: 1,
});
const paymentIntent = payments.data[0]?.payment?.payment_intent;
const clientSecret = paymentIntent.client_secret;
```

> **IMPORTANT**: In older Stripe API versions, you could use `expand: ["latest_invoice.payment_intent"]` and access `invoice.payment_intent.client_secret`. The Clover API restructured this — PaymentIntents are now under `invoice.payments` (InvoicePayment objects). Also, Stripe limits expansion to 4 levels max.

### Step 3: Render Payment Element (Client)
```tsx
<Elements stripe={stripePromise} options={{ clientSecret, appearance: { ... } }}>
  <PaymentForm onSuccess={handleSuccess} />
</Elements>
```

### Step 4: Confirm Payment (Client)
```typescript
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: { return_url: "..." },
  redirect: "if_required",
});
```

### Step 5: Activate Subscription (Server Action — immediate)
After `confirmPayment` succeeds, call `activateSubscription(subscriptionId)` which:
1. Retrieves subscription from Stripe API
2. Verifies it belongs to the user's org
3. Updates org in DB: plan, limits, status, clears trial

### Step 6: Webhook (backup/production)
The `invoice.paid` webhook does the same activation. This ensures the plan updates even if the client-side action fails or for recurring payments.

---

## 5. Database Schema

### organizations table
```sql
plan TEXT DEFAULT 'free',
subscription_status TEXT DEFAULT 'trialing',
stripe_customer_id TEXT,
stripe_subscription_id TEXT,
trial_ends_at TIMESTAMPTZ,
max_projects INTEGER DEFAULT 1,
max_keywords INTEGER DEFAULT 50,
max_pages_crawl INTEGER DEFAULT 100,
max_users INTEGER DEFAULT 1,
```

### billing_events table
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
organization_id UUID REFERENCES organizations(id),
stripe_event_id TEXT,
event_type TEXT,
amount_cents INTEGER,
currency TEXT DEFAULT 'usd',
created_at TIMESTAMPTZ DEFAULT now()
```

---

## 6. Trial System

### Setup
- On account creation, set `trial_ends_at` to 14 days from now
- Set `subscription_status` to `'trialing'`
- Set `plan` to `'free'`

### Enforcement
- Dashboard layout checks `trial_ends_at < now()` + `plan === 'free'`
- If expired: show lockout screen (except settings/billing page)
- Trial banner shows countdown timer (days:hours:minutes:seconds)
- Auto-reload when timer hits zero

### Clearing
- On successful payment: `activateSubscription` sets `trial_ends_at: null`
- Webhook `invoice.paid` also clears it

---

## 7. Stripe API Version Notes (2026-02-25.clover)

Key differences from older versions:
1. **Invoice.payment_intent** removed — Use `invoice.payments` (InvoicePayment list)
2. **Invoice.subscription** removed — Use `invoice.parent.subscription_details.subscription`
3. **Invoice.confirmation_secret** — New field with `client_secret`, but NOT populated for `default_incomplete` subscriptions
4. **Expand depth limit** — Max 4 levels. Use separate API calls for deeper nesting.
5. **InvoicePayments API** — New `stripe.invoicePayments.list({ invoice: id })` endpoint

---

## 8. Webhook Event Handling

| Event | Action |
|-------|--------|
| `invoice.paid` | Activate subscription: update plan, limits, clear trial, log event |
| `invoice.payment_failed` | Set status to `past_due`, log event |
| `customer.subscription.updated` | Sync plan/status/limits from Stripe |
| `customer.subscription.deleted` | Reset to free plan, clear Stripe IDs |

### Finding org from webhook:
```typescript
// invoice.paid — get subscription ID from parent
const subscriptionId = invoice.parent?.subscription_details?.subscription;

// All events — find org by Stripe customer ID
const { data: org } = await supabase
  .from("organizations")
  .select("id, plan")
  .eq("stripe_customer_id", customerId)
  .single();
```

---

## 9. Custom Payment UI Styling

The Payment Element is fully stylable via the `appearance` option:
```typescript
appearance: {
  theme: "flat",
  variables: {
    colorPrimary: "#c0392b",
    colorBackground: "#f5f2ed",
    colorText: "#1a1a1a",
    fontFamily: "IBM Plex Sans, system-ui, sans-serif",
    borderRadius: "0px",
  },
  rules: {
    ".Input": { border: "1px solid #d4d0cb", boxShadow: "none" },
    ".Tab--selected": { backgroundColor: "#1a1a1a", color: "#f5f2ed" },
    ".Label": { fontSize: "11px", fontWeight: "700", textTransform: "uppercase" },
  },
}
```

This gives you full control over the look and feel. Add "Powered by Stripe" text yourself.

---

## 10. Local Development

Webhooks can't reach `localhost`. Two approaches:
1. **activateSubscription server action** (implemented) — Called directly after payment, no webhook needed
2. **Stripe CLI** — `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

The server action approach is simpler and works as a safety net in production too.

---

## 11. Checklist for New Projects

- [ ] Create Stripe account + products/prices
- [ ] Add webhook endpoint with correct events
- [ ] Set all 6 env vars
- [ ] Install `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`
- [ ] Create `lib/stripe/client.ts` with plan config
- [ ] Create `lib/actions/billing.ts` with checkout + activation + portal actions
- [ ] Create `api/webhooks/stripe/route.ts` webhook handler
- [ ] Add payment UI with Elements + PaymentElement
- [ ] Add `trial_ends_at`, `stripe_*` columns to org/account table
- [ ] Add billing_events table for audit trail
- [ ] Test with Stripe test cards (4242 4242 4242 4242)
- [ ] Set up Stripe Customer Portal for self-service
- [ ] Add admin revenue dashboard with MRR/churn/analytics
