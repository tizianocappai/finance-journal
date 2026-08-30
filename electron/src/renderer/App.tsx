import { useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { useThemeStore, getResolvedTheme } from '@/stores/theme';
import Sidebar from '@/components/Sidebar';
import ResocontoLayout from '@/components/ResocontoLayout';
import DashboardScreen from '@/components/screens/DashboardScreen';
import MovimentiScreen from '@/components/screens/MovimentiScreen';
import ImpostazioniScreen from '@/components/screens/ImpostazioniScreen';
import Toast from '@/components/Toast';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function App() {
  const { theme } = useThemeStore();

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
    <MemoryRouter initialEntries={['/resoconto/dashboard']}>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Routes>
            <Route path="/resoconto" element={<ResocontoLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardScreen />} />
              <Route path="movimenti" element={<MovimentiScreen />} />
            </Route>
            <Route path="/impostazioni" element={<ImpostazioniScreen />} />
            <Route path="*" element={<Navigate to="/resoconto/dashboard" replace />} />
          </Routes>
        </div>
      </div>
      <Toast />
    </MemoryRouter>
  );
}

