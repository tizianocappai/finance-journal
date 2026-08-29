import { useState } from 'react';
import { useThemeStore, type Theme } from '@/stores/theme';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
  { value: 'system', label: 'Sistema' },
];

interface StatusMsg {
  type: 'success' | 'error';
  text: string;
}

export default function ImpostazioniScreen() {
  const { theme, setTheme } = useThemeStore();
  const [dataStatus, setDataStatus] = useState<StatusMsg | null>(null);
  const [loadingOp, setLoadingOp] = useState<'csv' | 'json' | 'import' | null>(null);

  async function handleExportCsv() {
    setLoadingOp('csv');
    setDataStatus(null);
    try {
      const result = await window.electronAPI.fileOps.exportCsv();
      if (result === null) {
        setDataStatus(null); // utente ha annullato
      } else {
        setDataStatus({ type: 'success', text: `CSV salvato in: ${result.path}` });
      }
    } catch (err) {
      setDataStatus({ type: 'error', text: `Errore export CSV: ${String(err)}` });
    } finally {
      setLoadingOp(null);
    }
  }

  async function handleExportJson() {
    setLoadingOp('json');
    setDataStatus(null);
    try {
      const result = await window.electronAPI.fileOps.exportJson();
      if (result === null) {
        setDataStatus(null);
      } else {
        setDataStatus({ type: 'success', text: `JSON salvato in: ${result.path}` });
      }
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
      if (result === null) {
        setDataStatus(null);
      } else {
        setDataStatus({ type: 'success', text: 'Import completato. L\'app si riavvierà tra poco.' });
      }
    } catch (err) {
      setDataStatus({ type: 'error', text: `Errore import: ${String(err)}` });
    } finally {
      setLoadingOp(null);
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      <section aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="mb-1 text-sm font-semibold text-foreground">
          Aspetto
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Scegli il tema dell&apos;applicazione.
        </p>

        <div className="flex gap-2" role="group" aria-label="Tema">
          {THEME_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                'rounded-md border px-4 py-2 text-sm transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring',
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

      <section aria-labelledby="data-heading">
        <h2 id="data-heading" className="mb-1 text-sm font-semibold text-foreground">
          Dati
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Esporta i tuoi movimenti o importa un database da un&apos;altra installazione.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { void handleExportCsv(); }}
            disabled={loadingOp !== null}
            className={cn(
              'rounded-md border px-4 py-2 text-sm transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'border-border bg-background text-muted-foreground hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {loadingOp === 'csv' ? 'Esportazione…' : 'Esporta CSV'}
          </button>

          <button
            onClick={() => { void handleExportJson(); }}
            disabled={loadingOp !== null}
            className={cn(
              'rounded-md border px-4 py-2 text-sm transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'border-border bg-background text-muted-foreground hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {loadingOp === 'json' ? 'Esportazione…' : 'Esporta JSON'}
          </button>

          <button
            onClick={() => { void handleImportDb(); }}
            disabled={loadingOp !== null}
            className={cn(
              'rounded-md border px-4 py-2 text-sm transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'border-border bg-background text-muted-foreground hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {loadingOp === 'import' ? 'Importazione…' : 'Importa database'}
          </button>
        </div>

        {dataStatus !== null && (
          <p
            role="status"
            className={cn(
              'mt-3 text-xs',
              dataStatus.type === 'success' ? 'text-foreground' : 'text-destructive',
            )}
          >
            {dataStatus.text}
          </p>
        )}
      </section>

      <section aria-labelledby="about-heading">
        <h2 id="about-heading" className="mb-1 text-sm font-semibold text-foreground">
          Informazioni
        </h2>
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
  );
}
