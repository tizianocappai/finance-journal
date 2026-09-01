import { useEffect, useState } from 'react';
import { useThemeStore, type Theme } from '@/stores/theme';
import { cn } from '@/lib/utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
  { value: 'system', label: 'Sistema' },
];

const BTN_BASE =
  'rounded-md border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
const BTN_MUTED =
  `${BTN_BASE} border-border bg-background text-muted-foreground hover:text-foreground`;
const BTN_PRIMARY =
  `${BTN_BASE} border-primary bg-primary text-primary-foreground hover:opacity-90`;

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-1 text-sm font-semibold text-foreground">
      {children}
    </h2>
  );
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-xs text-muted-foreground">{children}</p>;
}

interface StatusMsg { type: 'success' | 'error'; text: string }

function StatusLine({ msg }: { msg: StatusMsg | null }) {
  if (!msg) return null;
  return (
    <p role="status" className={cn('mt-2 text-xs', msg.type === 'success' ? 'text-foreground' : 'text-destructive')}>
      {msg.text}
    </p>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function ImpostazioniScreen() {
  const { theme, setTheme } = useThemeStore();

  const [dbPath, setDbPath] = useState<string>('');
  const [dataStatus, setDataStatus] = useState<StatusMsg | null>(null);
  const [loadingOp, setLoadingOp] = useState<'json' | 'import' | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const path = await window.electronAPI.impostazioni.dbPath();
        setDbPath(path);
      } catch (err) {
        console.error('Failed to load db path:', err);
      }
    })();
  }, []);

  async function handleExportJson() {
    setLoadingOp('json');
    setDataStatus(null);
    try {
      const result = await window.electronAPI.fileOps.exportJson();
      setDataStatus(result ? { type: 'success', text: `JSON salvato in: ${result.path}` } : null);
    } catch (err) {
      setDataStatus({ type: 'error', text: `Errore export JSON: ${String(err)}` });
    } finally {
      setLoadingOp(null);
    }
  }

  async function handleImportDb() {
    setLoadingOp('import');
    setDataStatus(null);
    try {
      const result = await window.electronAPI.fileOps.importDb();
      setDataStatus(result === null ? null : { type: 'success', text: "Import completato. L'app si riavvierà tra poco." });
    } catch (err) {
      setDataStatus({ type: 'error', text: `Errore import: ${String(err)}` });
    } finally {
      setLoadingOp(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-6 py-3">
        <h1 className="text-base font-semibold text-foreground">Impostazioni</h1>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-lg space-y-8">

          {/* Database */}
          <section aria-labelledby="db-heading">
            <SectionHeading id="db-heading">Database</SectionHeading>
            <SectionDesc>Percorso del file di database attivo.</SectionDesc>
            <div className={cn(
              'rounded-md border border-border bg-muted px-3 py-2 text-xs',
              'font-mono text-muted-foreground break-all select-all',
            )}>
              {dbPath || '—'}
            </div>
          </section>

          {/* Aspetto */}
          <section aria-labelledby="appearance-heading">
            <SectionHeading id="appearance-heading">Aspetto</SectionHeading>
            <SectionDesc>Scegli il tema dell&apos;applicazione.</SectionDesc>
            <div className="flex gap-2" role="group" aria-label="Tema">
              {THEME_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  aria-pressed={theme === value}
                  className={cn(
                    BTN_BASE,
                    theme === value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Dati */}
          <section aria-labelledby="data-heading">
            <SectionHeading id="data-heading">Dati</SectionHeading>
            <SectionDesc>Esporta un backup JSON o importa un database da un&apos;altra installazione.</SectionDesc>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'json' as const, idle: 'Esporta JSON', busy: 'Esportazione…', action: handleExportJson },
                  { key: 'import' as const, idle: 'Importa database', busy: 'Importazione…', action: handleImportDb },
                ] as const
              ).map(({ key, idle, busy, action }) => (
                <button
                  key={key}
                  onClick={() => { void action(); }}
                  disabled={loadingOp !== null}
                  className={BTN_MUTED}
                >
                  {loadingOp === key ? busy : idle}
                </button>
              ))}
            </div>
            <StatusLine msg={dataStatus} />
          </section>

          {/* Informazioni */}
          <section aria-labelledby="about-heading">
            <SectionHeading id="about-heading">Informazioni</SectionHeading>
            <dl className="space-y-1 text-xs text-muted-foreground">
              <div className="flex gap-2">
                <dt className="font-medium text-foreground">Versione</dt>
                <dd>0.1.0</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-foreground">Nome</dt>
                <dd>No Budget</dd>
              </div>
            </dl>
          </section>

        </div>
      </main>
    </div>
  );
}
