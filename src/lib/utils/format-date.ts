/**
 * Timezone-aware date formatting utility.
 *
 * All dashboard date displays should use these functions
 * with the user's timezone from their profile settings.
 */

/** Format a date string or Date object with the user's timezone */
export function formatDate(
  date: string | Date | null | undefined,
  timezone: string = "UTC",
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "N/A";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "N/A";

  const defaults: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  };

  return d.toLocaleDateString("en-US", { ...defaults, ...options });
}

/** Format a date with time (e.g., "Mar 20, 2026, 8:03 PM") */
export function formatDateTime(
  date: string | Date | null | undefined,
  timezone: string = "UTC"
): string {
  if (!date) return "N/A";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "N/A";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

/** Format just the date line for the masthead (e.g., "Friday, March 20, 2026") */
export function formatDateLine(
  date: Date,
  timezone: string = "UTC"
): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
}

/** Format a short date for charts (e.g., "Mar 20") */
export function formatShortDate(
  date: string | Date,
  timezone: string = "UTC"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
}
