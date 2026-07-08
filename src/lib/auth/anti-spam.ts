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
