import type { Metadata } from "next";
import { Playfair_Display, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

/* ------------------------------------------------------------------
   Fonts
   ------------------------------------------------------------------ */

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-serif",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

/* ------------------------------------------------------------------
   Metadata
   ------------------------------------------------------------------ */

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: {
    default: "Optic Rank — AI-Powered SEO Intelligence Platform",
    template: "%s | Optic Rank",
  },
  description:
    "AI-powered SEO intelligence platform. Track keyword rankings, monitor competitors, audit your site, and get actionable AI insights to grow your organic traffic.",
  keywords: [
    "SEO",
    "keyword tracking",
    "competitor analysis",
    "site audit",
    "AI SEO",
    "rank tracking",
    "organic traffic",
  ],
  authors: [{ name: "Optic Rank" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Optic Rank",
    title: "Optic Rank - AI-Powered SEO Intelligence",
    description:
      "Track keyword rankings, monitor competitors, audit your site, and get actionable AI insights to grow your organic traffic.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Optic Rank",
    description:
      "AI-powered SEO intelligence platform for modern teams.",
  },
};

/* ------------------------------------------------------------------
   Inline script to prevent flash of wrong theme (FOUC prevention).
   Runs synchronously before first paint. Reads the persisted Zustand
   store value from localStorage.
   ------------------------------------------------------------------ */

const themeScript = `
(function() {
  try {
    var raw = localStorage.getItem('opticrank-theme');
    if (raw) {
      var parsed = JSON.parse(raw);
      var theme = parsed && parsed.state && parsed.state.theme;
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'system') {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        }
      }
    } else {
      // Default: follow system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }
  } catch (e) {}
})();
`;

/* ------------------------------------------------------------------
   Root Layout
   ------------------------------------------------------------------ */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfairDisplay.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-surface-cream font-sans text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
