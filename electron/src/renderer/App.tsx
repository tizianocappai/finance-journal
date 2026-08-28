import { useEffect } from 'react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { AgCharts } from 'ag-charts-community';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app';
import { useThemeStore, getResolvedTheme, type Theme } from '@/stores/theme';

ModuleRegistry.registerModules([AllCommunityModule]);
void AgCharts;

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const { theme, setTheme } = useThemeStore();

  // Apply class and watch OS preference changes at runtime.
  useEffect(() => {
    const applyDark = (isDark: boolean) => {
      document.documentElement.classList.toggle('dark', isDark);
    };

    const resolved = getResolvedTheme(theme);
    applyDark(resolved === 'dark');

    if (theme === 'system') {
      try {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => applyDark(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
      } catch (err) {
        console.warn('matchMedia listener not available:', err);
      }
    }
  }, [theme]);

  return (
    <div
      className={cn(
        'flex h-screen w-screen flex-col items-center justify-center gap-6',
        'bg-background text-foreground',
      )}
    >
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">No Budget</h1>
        <p className="text-sm text-muted-foreground">
          {ready ? 'Scaffold pronto — sviluppo in corso.' : 'Caricamento...'}
        </p>
      </div>

      {/* Theme toggle — temporary, for testing */}
      <div className="flex gap-2">
        {(['light', 'dark', 'system'] as Theme[]).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={cn(
              'rounded border px-3 py-1 text-xs transition-colors',
              theme === t
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            {THEME_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>React 19</span>
        <span>·</span>
        <span>Tailwind v4</span>
        <span>·</span>
        <span>AG Grid 36</span>
        <span>·</span>
        <span>AG Charts 14</span>
        <span>·</span>
        <span>Zustand 5</span>
      </div>
    </div>
  );
}
