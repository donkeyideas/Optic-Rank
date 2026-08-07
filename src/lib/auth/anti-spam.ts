/**
 * Anti-spam helpers for the signup flow.
 *
 * These are self-contained (no external services) and target the two most
 * common abuse patterns we see on signup:
 *   1. Gmail dot/alias abuse — `j.o.y+x@gmail.com` == `joy@gmail.com` to Gmail,
 *      but Supabase treats each raw string as a distinct email, letting one
 *      inbox spawn unlimited accounts. `normalizeEmail` collapses these so we
 *      can dedupe against a canonical form.
 *   2. Disposable / throwaway inboxes — blocked via a domain list.
 */

/**
 * Providers that ignore dots in the local part of the address. For these we
 * strip dots when computing the canonical form.
 */
const DOT_INSENSITIVE_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
]);

/** Domains that are aliases of another canonical domain. */
const DOMAIN_ALIASES: Record<string, string> = {
  "googlemail.com": "gmail.com",
};

/**
 * A non-exhaustive list of disposable / throwaway email domains. Signups from
 * these are almost always spam or trial abuse.
 */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "temp-mail.org",
  "tempmail.com",
  "tempmailo.com",
  "throwawaymail.com",
  "yopmail.com",
  "getnada.com",
  "trashmail.com",
  "mailnesia.com",
  "dispostable.com",
  "fakeinbox.com",
  "maildrop.cc",
  "mohmal.com",
  "moakt.com",
  "emailondeck.com",
  "mintemail.com",
  "spamgourmet.com",
  "tempinbox.com",
  "burnermail.io",
  "mailcatch.com",
  "inboxbear.com",
  "tmpmail.org",
  "tmpmail.net",
  "1secmail.com",
  "1secmail.org",
  "1secmail.net",
  "emailfake.com",
  "mailtemp.net",
]);

/**
 * Reduce an email to a canonical form so that provider-specific aliasing tricks
 * (dots, `+tags`, googlemail⇄gmail) all collapse to a single identity.
 *
 * Returns null if the input isn't a syntactically valid email.
 */
export function normalizeEmail(rawEmail: string): string | null {
  const email = (rawEmail || "").trim().toLowerCase();

  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;

  let local = email.slice(0, at);
  let domain = email.slice(at + 1);

  // Basic sanity: domain must contain a dot and no whitespace.
  if (!domain.includes(".") || /\s/.test(email)) return null;

  // Resolve domain aliases (e.g. googlemail.com -> gmail.com).
  domain = DOMAIN_ALIASES[domain] ?? domain;

  // Strip +tag sub-addressing for every provider that supports it (most do).
  const plus = local.indexOf("+");
  if (plus !== -1) local = local.slice(0, plus);

  // Strip dots for providers that ignore them.
  if (DOT_INSENSITIVE_DOMAINS.has(domain)) {
    local = local.replace(/\./g, "");
  }

  if (!local) return null;

  return `${local}@${domain}`;
}

/** True if the email's domain is a known disposable/throwaway provider. */
export function isDisposableEmail(rawEmail: string): boolean {
  const email = (rawEmail || "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1);
  return DISPOSABLE_DOMAINS.has(domain);
}

/** Loose RFC-ish email format check — rejects obviously malformed inputs. */
export function isValidEmailFormat(rawEmail: string): boolean {
  const email = (rawEmail || "").trim();
  // Single @, no whitespace, a dot in the domain, reasonable length.
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

/**
 * Verify the email's domain can actually receive mail by looking up MX (or, as a
 * fallback, A/AAAA) DNS records. Domains with no mail server are almost always
 * junk/disposable. Uses Node's built-in DNS resolver — no external service.
 *
 * Fails OPEN (returns true) on lookup timeout/DNS errors so a transient DNS
 * hiccup never blocks a legitimate signup. Uses a short timeout so signup can't
 * hang on a slow resolver.
 */
export async function hasDeliverableDomain(
  rawEmail: string,
  timeoutMs = 3000
): Promise<boolean> {
  const email = (rawEmail || "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1);
  if (!domain) return false;

  // Lazy import so the module stays usable in edge/client contexts.
  const dns = await import("node:dns/promises");

  const withTimeout = <T>(p: Promise<T>): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("dns-timeout")), timeoutMs)
      ),
    ]);

  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    if (mx && mx.length > 0 && mx.some((r) => r.exchange)) return true;
  } catch {
    // No MX — fall through to A/AAAA check.
  }

  try {
    const a = await withTimeout(dns.resolve(domain));
    if (a && a.length > 0) return true;
  } catch (err) {
    // Distinguish "domain doesn't exist" (block) from timeout/other (allow).
    const code = (err as { code?: string })?.code;
    if (code === "ENOTFOUND" || code === "NXDOMAIN") return false;
    return true; // fail open on transient/unknown DNS errors
  }

  return false;
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 *
 * Fails OPEN (returns true) when TURNSTILE_SECRET_KEY isn't configured — so the
 * feature stays dormant until you add the keys — and on network/Cloudflare
 * errors, so a Cloudflare outage never locks real users out. Fails CLOSED
 * (returns false) only on an explicit verification failure or a missing token
 * when the secret IS configured.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured yet → don't block
  if (!token) return false; // configured but no token → bot / JS disabled

  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);
    if (remoteIp && remoteIp !== "unknown") body.append("remoteip", remoteIp);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return true; // fail open on transient network error
  }
}

/**
 * Reject obviously bot-generated / junk names. Real names aren't URLs, aren't
 * all digits, and aren't a single character repeated. Kept intentionally loose
 * so legitimate international / single-word names still pass.
 */
export function isPlausibleName(rawName: string): boolean {
  const name = (rawName || "").trim();
  if (name.length < 2 || name.length > 100) return false;
  if (/https?:\/\/|www\.|\.[a-z]{2,}\//i.test(name)) return false; // contains a URL
  if (/^\d+$/.test(name)) return false; // all digits
  if (/^(.)\1+$/.test(name)) return false; // one char repeated (aaaa, ....)
  if (!/[a-zA-ZÀ-￿]/.test(name)) return false; // no letters at all
  return true;
}
