"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/stores/theme-store";

/**
 * ThemeProvider
 *
 * Wraps the application and manages the dark/light class on the <html> element.
 * Uses an inline <script> injected by the root layout to prevent FOUC (flash of
 * unstyled content). This component handles ongoing theme synchronization after
 * hydration completes.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  // Mark as mounted after hydration to avoid SSR/client mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply the theme class whenever it changes (after mount)
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    if (theme === "system") {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.classList.toggle("dark", systemPrefersDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [theme, resolvedTheme, mounted]);

  // Listen for system preference changes when theme is set to "system"
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleChange() {
      const currentTheme = useThemeStore.getState().theme;
      if (currentTheme === "system") {
        document.documentElement.classList.toggle("dark", mediaQuery.matches);
      }
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mounted]);

  return <>{children}</>;
}
