/**
 * Small store logo badges for Apple App Store and Google Play.
 * Used alongside app names/icons in the App Store section.
 */

export function StoreBadge({
  store,
  size = "sm",
}: {
  store: "apple" | "google";
  size?: "xs" | "sm";
}) {
  const dim = size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (store === "apple") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${dim} shrink-0`}
        fill="currentColor"
        aria-label="Apple App Store"
      >
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={`${dim} shrink-0`}
      fill="currentColor"
      aria-label="Google Play Store"
    >
      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.108 12l2.59-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z" />
    </svg>
  );
}
