import { useEffect, useRef, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useThemeStore, type Theme } from '@/stores/theme';
import { useLookupStore } from '@/stores/lookup';
import { cn } from '@/lib/utils';
import type { Categoria, MetodoPagamento } from '../../../ipc/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

const IMPOSTAZIONI_KEYS = {
  valuta: 'valuta',
  saldoImporto: 'saldo_iniziale_importo',
  saldoData: 'saldo_iniziale_data',
} as const;

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
const BTN_GHOST =
  'p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed';

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

// ─── entity list (categorie / metodi) ─────────────────────────────────────────

interface EntityItem {
  id: number;
  nome: string;
  isPredefined: boolean;
}

interface EntityListProps {
  headingId: string;
  label: string;
  description: string;
  predefinedLabel: string;
  items: EntityItem[];
  onAdd: (nome: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function EntityList({ headingId, label, description, predefinedLabel, items, onAdd, onDelete }: EntityListProps) {
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    const nome = input.trim();
    if (!nome) return;
    setAdding(true);
    setErr(null);
    try {
      await onAdd(nome);
      setInput('');
      inputRef.current?.focus();
    } catch (e) {
      setErr(String(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    setErr(null);
    try {
      await onDelete(id);
    } catch (e) {
      setErr(String(e));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section aria-labelledby={headingId}>
      <SectionHeading id={headingId}>{label}</SectionHeading>
      <SectionDesc>{description}</SectionDesc>

      <ul role="list" className="mb-3 divide-y divide-border rounded-md border border-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className={cn('flex-1', item.isPredefined && 'text-muted-foreground')}>
              {item.nome}
              {item.isPredefined && (
                <span className="ml-2 text-xs text-muted-foreground/60">({predefinedLabel})</span>
              )}
            </span>
            {!item.isPredefined && (
              <button
                onClick={() => { void handleDelete(item.id); }}
                disabled={deleting === item.id}
                aria-label={`Elimina ${item.nome}`}
                className={BTN_GHOST}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-3 py-2 text-xs text-muted-foreground">Nessun elemento.</li>
        )}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); void handleAdd(); }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Aggiungi ${label.toLowerCase()}…`}
          aria-label={`Nome nuova ${label.toLowerCase()}`}
          className={cn(
            'flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm',
            'text-foreground placeholder:text-muted-foreground',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        />
        <button
          type="submit"
          disabled={adding || !input.trim()}
          className={BTN_PRIMARY}
          aria-label={`Aggiungi ${label.toLowerCase()}`}
        >
          <Plus size={14} aria-hidden />
        </button>
      </form>

      {err && <p role="alert" className="mt-1 text-xs text-destructive">{err}</p>}
    </section>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function ImpostazioniScreen() {
  const { theme, setTheme } = useThemeStore();
  const { categorie, metodi, syncCategorie, createCategoria, deleteCategoria, syncMetodi, createMetodo, deleteMetodo } = useLookupStore();

  const [dbPath, setDbPath] = useState<string>('');
  const [valuta, setValuta] = useState('');
  const [saldoImporto, setSaldoImporto] = useState('');
  const [saldoData, setSaldoData] = useState('');
  const [prefStatus, setPrefStatus] = useState<StatusMsg | null>(null);
  const [dataStatus, setDataStatus] = useState<StatusMsg | null>(null);
  const [loadingOp, setLoadingOp] = useState<'csv' | 'json' | 'import' | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [path, v, si, sid] = await Promise.all([
          window.electronAPI.impostazioni.dbPath(),
          window.electronAPI.impostazioni.get(IMPOSTAZIONI_KEYS.valuta),
          window.electronAPI.impostazioni.get(IMPOSTAZIONI_KEYS.saldoImporto),
          window.electronAPI.impostazioni.get(IMPOSTAZIONI_KEYS.saldoData),
        ]);
        setDbPath(path);
        if (v) setValuta(v);
        if (si) setSaldoImporto(si);
        if (sid) setSaldoData(sid);
      } catch (err) {
        console.error('Failed to load impostazioni:', err);
      }
    })();
    void syncCategorie();
    void syncMetodi();
  }, []);

  async function handleSavePreferenze() {
    setPrefStatus(null);
    try {
      await Promise.all([
        window.electronAPI.impostazioni.set(IMPOSTAZIONI_KEYS.valuta, valuta.trim()),
        window.electronAPI.impostazioni.set(IMPOSTAZIONI_KEYS.saldoImporto, saldoImporto.trim()),
        window.electronAPI.impostazioni.set(IMPOSTAZIONI_KEYS.saldoData, saldoData),
      ]);
      setPrefStatus({ type: 'success', text: 'Preferenze salvate.' });
    } catch (err) {
      setPrefStatus({ type: 'error', text: `Errore: ${String(err)}` });
    }
  }

  async function handleExportCsv() {
    setLoadingOp('csv');
    setDataStatus(null);
    try {
      const result = await window.electronAPI.fileOps.exportCsv();
      setDataStatus(result ? { type: 'success', text: `CSV salvato in: ${result.path}` } : null);
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

  const categorieItems: EntityItem[] = categorie.map((c: Categoria) => ({
    id: c.id,
    nome: c.nome,
    isPredefined: Boolean(c.predefinita),
  }));

  const metodiItems: EntityItem[] = metodi.map((m: MetodoPagamento) => ({
    id: m.id,
    nome: m.nome,
    isPredefined: Boolean(m.predefinito),
  }));

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
            <SectionDesc>Esporta i movimenti o importa un database da un&apos;altra installazione.</SectionDesc>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'csv' as const, idle: 'Esporta CSV', busy: 'Esportazione…', action: handleExportCsv },
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

          {/* Categorie */}
          <EntityList
            headingId="categorie-heading"
            label="Categorie"
            description="Aggiungi categorie personalizzate o elimina quelle che non usi. Le categorie predefinite non sono eliminabili."
            predefinedLabel="predefinita"
            items={categorieItems}
            onAdd={createCategoria}
            onDelete={deleteCategoria}
          />

          {/* Metodi di pagamento */}
          <EntityList
            headingId="metodi-heading"
            label="Metodi di pagamento"
            description="Aggiungi metodi personalizzati o elimina quelli non utilizzati. I metodi predefiniti non sono eliminabili."
            predefinedLabel="predefinito"
            items={metodiItems}
            onAdd={createMetodo}
            onDelete={deleteMetodo}
          />

          {/* Preferenze */}
          <section aria-labelledby="pref-heading">
            <SectionHeading id="pref-heading">Preferenze</SectionHeading>
            <SectionDesc>Valuta visualizzata e saldo iniziale del conto.</SectionDesc>

            <div className="space-y-4">
              <div>
                <label htmlFor="valuta" className="mb-1 block text-xs font-medium text-foreground">
                  Valuta
                </label>
                <input
                  id="valuta"
                  type="text"
                  value={valuta}
                  onChange={(e) => setValuta(e.target.value)}
                  placeholder="EUR"
                  maxLength={8}
                  className={cn(
                    'w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm',
                    'text-foreground placeholder:text-muted-foreground',
                    'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-1 text-xs font-medium text-foreground">Saldo iniziale</legend>
                <div className="flex gap-3">
                  <div>
                    <label htmlFor="saldo-importo" className="mb-1 block text-xs text-muted-foreground">
                      Importo
                    </label>
                    <input
                      id="saldo-importo"
                      type="number"
                      value={saldoImporto}
                      onChange={(e) => setSaldoImporto(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className={cn(
                        'w-36 rounded-md border border-border bg-background px-3 py-1.5 text-sm',
                        'text-foreground placeholder:text-muted-foreground',
                        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    />
                  </div>
                  <div>
                    <label htmlFor="saldo-data" className="mb-1 block text-xs text-muted-foreground">
                      Data
                    </label>
                    <input
                      id="saldo-data"
                      type="date"
                      value={saldoData}
                      onChange={(e) => setSaldoData(e.target.value)}
                      className={cn(
                        'rounded-md border border-border bg-background px-3 py-1.5 text-sm',
                        'text-foreground',
                        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    />
                  </div>
                </div>
              </fieldset>

              <button
                onClick={() => { void handleSavePreferenze(); }}
                className={BTN_PRIMARY}
              >
                Salva preferenze
              </button>
              <StatusLine msg={prefStatus} />
            </div>
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
