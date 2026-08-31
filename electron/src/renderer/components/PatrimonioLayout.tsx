import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatrimonioStore } from '@/stores/patrimonio';
import type { Granularita } from '../../ipc/types';

const TABS = [
  { label: 'Panoramica', to: '/patrimonio/panoramica' },
] as const;

const GRANULARITA_OPTIONS: { label: string; value: Granularita }[] = [
  { label: 'Mensile', value: 'mese' },
  { label: 'Trimestrale', value: 'quarter' },
];

function TabChip({ label, to }: { label: string; to: string }) {
  const isActive = !!useMatch(to);

  return (
    <NavLink
      to={to}
      end
      role="tab"
      aria-selected={isActive}
      className={cn(
        'rounded-full px-4 py-1 text-sm font-medium transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {label}
    </NavLink>
  );
}

export default function PatrimonioLayout() {
  const { anno, granularita, setAnno, setGranularita, loadGranularita, countValoriNascosti } = usePatrimonioStore();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadGranularita();
  }, [loadGranularita]);

  useEffect(() => {
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  function showToast(msg: string) {
    clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 4500);
  }

  async function handleGranularitaChange(nuova: Granularita) {
    try {
      const count = await countValoriNascosti(nuova);
      if (count > 0) {
        const modalita = nuova === 'quarter' ? 'trimestrale' : 'mensile';
        const plurale = count === 1;
        showToast(
          `${count} valor${plurale ? 'e' : 'i'} non sar${plurale ? 'à' : 'anno'} visibil${plurale ? 'e' : 'i'} in modalità ${modalita}. I dati non sono persi.`,
        );
      }
    } catch (err) {
      console.error('Failed to count valori nascosti:', err);
    }
    await setGranularita(nuova);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-6 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-foreground">Situazione Patrimoniale</h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2" aria-label="Navigatore anno">
              <button
                onClick={() => setAnno(anno - 1)}
                aria-label="Anno precedente"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <ChevronLeft size={16} aria-hidden />
              </button>
              <span className="min-w-12 text-center text-sm font-semibold tabular-nums text-foreground">
                {anno}
              </span>
              <button
                onClick={() => setAnno(anno + 1)}
                aria-label="Anno successivo"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>

            <select
              value={granularita}
              onChange={(e) => handleGranularitaChange(e.target.value as Granularita)}
              aria-label="Granularità"
              className={cn(
                'h-7 rounded-md border border-border bg-background px-2 text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
              )}
            >
              {GRANULARITA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-1" role="tablist" aria-label="Sezioni patrimonio">
          {TABS.map((tab) => (
            <TabChip key={tab.to} {...tab} />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>

      {toastMsg && (
        <div
          role="status"
          aria-atomic="true"
          className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-md"
        >
          <span className="flex-1 text-sm text-foreground">{toastMsg}</span>
          <button
            onClick={() => setToastMsg(null)}
            aria-label="Chiudi notifica"
            className="mt-0.5 shrink-0 rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
