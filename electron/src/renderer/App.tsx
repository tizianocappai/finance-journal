import { useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { useThemeStore, getResolvedTheme } from '@/stores/theme';
import Sidebar from '@/components/Sidebar';
import ResocontoLayout from '@/components/ResocontoLayout';
import PatrimonioLayout from '@/components/PatrimonioLayout';
import DashboardScreen from '@/components/screens/DashboardScreen';
import MovimentiScreen from '@/components/screens/MovimentiScreen';
import ImpostazioniScreen from '@/components/screens/ImpostazioniScreen';
import ResocontoImpostazioniScreen from '@/components/screens/ResocontoImpostazioniScreen';
import PatrimonioPanoramicaScreen from '@/components/screens/PatrimonioPanoramicaScreen';
import PatrimonioAnalisiScreen from '@/components/screens/PatrimonioAnalisiScreen';
import Toast from '@/components/Toast';

ModuleRegistry.registerModules([AllCommunityModule]);

function ElectronRequired() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
      <div className="max-w-sm text-center space-y-3">
        <p className="text-lg font-semibold">App non disponibile nel browser</p>
        <p className="text-sm text-muted-foreground">
          No Budget richiede l&apos;app desktop Electron per funzionare. Avvia l&apos;app con{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run dev</code> e usa la finestra Electron.
        </p>
      </div>
    </div>
  );
}

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

  if (!('electronAPI' in window)) return <ElectronRequired />;

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
              <Route path="impostazioni" element={<ResocontoImpostazioniScreen />} />
            </Route>
            <Route path="/patrimonio" element={<PatrimonioLayout />}>
              <Route index element={<Navigate to="panoramica" replace />} />
              <Route path="panoramica" element={<PatrimonioPanoramicaScreen />} />
              <Route path="analisi" element={<PatrimonioAnalisiScreen />} />
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

