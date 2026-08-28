import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ModuleRegistry, AllCommunityModule } from 'ag-charts-community';
import App from './App';

ModuleRegistry.registerModules(AllCommunityModule);

// Zero-flash: apply theme class synchronously before React mounts.
// Zustand persist stores JSON as {"state":{"theme":"..."},"version":0}.
try {
  const raw = localStorage.getItem('fj-theme');
  let theme = 'system';
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'state' in parsed &&
        parsed.state !== null &&
        typeof parsed.state === 'object' &&
        'theme' in parsed.state
      ) {
        const t = (parsed.state as Record<string, unknown>).theme;
        if (t === 'light' || t === 'dark' || t === 'system') {
          theme = t;
        }
      }
    } catch {
      theme = 'system';
    }
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
} catch (err) {
  console.warn('Failed to apply initial theme:', err);
}

try {
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (err) {
  console.error('Failed to mount React app:', err);
}
