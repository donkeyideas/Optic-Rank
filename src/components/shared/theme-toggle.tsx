"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const themeOrder: Theme[] = ["light", "dark", "system"];

const themeConfig: Record<Theme, { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: "Light mode" },
  dark: { icon: Moon, label: "Dark mode" },
  system: { icon: Monitor, label: "System theme" },
};

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  function cycleTheme() {
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  }

  const { icon: Icon, label } = themeConfig[theme];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={cn(
        "inline-flex items-center justify-center",
        "h-9 w-9 rounded-none border border-rule",
        "bg-surface-card text-ink-secondary",
        "hover:bg-surface-raised hover:text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-editorial-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-cream",
        "transition-colors duration-150",
        "cursor-pointer",
        className
      )}
      aria-label={label}
      title={label}
    >
      <Icon size={16} strokeWidth={1.5} />
    </button>
  );
}
