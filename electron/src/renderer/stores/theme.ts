import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system' as Theme,
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'fj-theme' },
  ),
);

export function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
  return theme;
}
