import { create } from "zustand";

interface AppState {
  isDarkMode: boolean;
  activeProjectId: string | null;
  toggleDarkMode: () => void;
  setActiveProjectId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: false,
  activeProjectId: null,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
}));
