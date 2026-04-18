import React, { createContext, useContext } from "react";
import { lightColors, darkColors, ColorScheme } from "./colors";
import { useAppStore } from "../stores/appStore";

interface ThemeContextType {
  colors: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDark = useAppStore((s) => s.isDarkMode);
  const toggleTheme = useAppStore((s) => s.toggleDarkMode);

  return (
    <ThemeContext.Provider value={{ colors: isDark ? darkColors : lightColors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
