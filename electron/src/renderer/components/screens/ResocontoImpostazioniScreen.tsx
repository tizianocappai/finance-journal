import { useEffect, useRef, useState } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { useLookupStore } from '@/stores/lookup';
import { cn } from '@/lib/utils';
import type { Categoria, MetodoPagamento, Dettaglio } from '../../../ipc/types';
import type { PreviewResult, ExecuteResult } from '../../../ipc/import_csv';

// ─── helpers ──────────────────────────────────────────────────────────────────

const IMPOSTAZIONI_KEYS = {
  valuta: 'valuta',
  saldoImporto: 'saldo_iniziale_importo',
  saldoData: 'saldo_iniziale_data',
} as const;

const BTN_BASE =
  'rounded-md border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
const BTN_MUTED =
  `${BTN_BASE} border-border bg-background text-muted-foreground hover:text-foreground`;
const BTN_PRIMARY =
  `${BTN_BASE} border-primary bg-primary text-primary-foreground hover:opacity-90`;
const BTN_GHOST =
  'p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed';
const PILL = 'inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground';
const SECTION_LABEL = 'mb-1 text-xs font-semibold text-foreground';

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

// ─── dettagli list ────────────────────────────────────────────────────────────

interface DettagliListProps {
  items: Dettaglio[];
  categorie: Categoria[];
  onAdd: (nome: string, categoria_id?: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdateCategoria: (id: number, categoria_id: number | null) => Promise<void>;
}

function DettagliList({ items, categorie, onAdd, onDelete, onUpdateCategoria }: DettagliListProps) {
  const [input, setInput] = useState('');
  const [addCatId, setAddCatId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; nome: string; count: number } | null>(null);
  const [updatingCat, setUpdatingCat] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    const nome = input.trim();
    if (!nome) return;
    setAdding(true);
    setErr(null);
    try {
      const catId = addCatId ? Number(addCatId) : undefined;
      await onAdd(nome, catId);
      setInput('');
      setAddCatId('');
      inputRef.current?.focus();
    } catch (e) {
      setErr(String(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteRequest(id: number, nome: string) {
    setErr(null);
    try {
      const count = await window.electronAPI.dettagli.countMovimenti(id);
      if (count > 0) {
        setPendingDelete({ id, nome, count });
      } else {
        await doDelete(id);
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  async function doDelete(id: number) {
    setDeleting(id);
    setPendingDelete(null);
    try {
      await onDelete(id);
    } catch (e) {
      setErr(String(e));
    } finally {
      setDeleting(null);
    }
  }

  async function handleCategoriaChange(id: number, value: string) {
    setUpdatingCat(id);
    setErr(null);
    try {
      await onUpdateCategoria(id, value ? Number(value) : null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setUpdatingCat(null);
    }
  }

  const SELECT_CLS = cn(
    'rounded-md border border-border bg-background px-2 py-1 text-xs',
    'text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  );

  return (
    <section aria-labelledby="dettagli-heading">
      <SectionHeading id="dettagli-heading">Dettagli</SectionHeading>
      <SectionDesc>
        Aggiungi dettagli personalizzati e associali a una categoria. I dettagli predefiniti non sono eliminabili.
      </SectionDesc>

      {pendingDelete && (
        <div
          role="alertdialog"
          aria-labelledby="del-warn-title"
          aria-describedby="del-warn-desc"
          className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
        >
          <p id="del-warn-title" className="font-medium text-destructive">
            Elimina «{pendingDelete.nome}»?
          </p>
          <p id="del-warn-desc" className="mt-0.5 text-xs text-muted-foreground">
            {pendingDelete.count} moviment{pendingDelete.count === 1 ? 'o' : 'i'} usa{pendingDelete.count === 1 ? '' : 'no'} questo dettaglio. Il campo dettaglio verrà impostato a vuoto, la categoria rimarrà invariata.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => { void doDelete(pendingDelete.id); }}
              disabled={deleting !== null}
              className={`${BTN_BASE} border-destructive bg-destructive text-destructive-foreground hover:opacity-90 text-xs`}
            >
              Elimina comunque
            </button>
            <button
              onClick={() => setPendingDelete(null)}
              className={`${BTN_MUTED} text-xs`}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      <ul role="list" className="mb-3 divide-y divide-border rounded-md border border-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className={cn('flex-1 truncate', item.predefinito && 'text-muted-foreground')}>
              {item.nome}
              {item.predefinito ? (
                <span className="ml-2 text-xs text-muted-foreground/60">(predefinito)</span>
              ) : null}
            </span>
            <select
              value={item.categoria_id ?? ''}
              onChange={(e) => { void handleCategoriaChange(item.id, e.target.value); }}
              disabled={updatingCat === item.id}
              aria-label={`Categoria di ${item.nome}`}
              className={SELECT_CLS}
            >
              <option value="">— nessuna —</option>
              {categorie.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            {!item.predefinito && (
              <button
                onClick={() => { void handleDeleteRequest(item.id, item.nome); }}
                disabled={deleting === item.id || pendingDelete !== null}
                aria-label={`Elimina ${item.nome}`}
                className={BTN_GHOST}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-3 py-2 text-xs text-muted-foreground">Nessun dettaglio.</li>
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
          placeholder="Nome dettaglio…"
          aria-label="Nome nuovo dettaglio"
          className={cn(
            'flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm',
            'text-foreground placeholder:text-muted-foreground',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        />
        <select
          value={addCatId}
          onChange={(e) => setAddCatId(e.target.value)}
          aria-label="Categoria nuovo dettaglio"
          className={cn(SELECT_CLS, 'py-1.5')}
        >
          <option value="">— categoria —</option>
          {categorie.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={adding || !input.trim()}
          className={BTN_PRIMARY}
          aria-label="Aggiungi dettaglio"
        >
          <Plus size={14} aria-hidden />
        </button>
      </form>

      {err && <p role="alert" className="mt-1 text-xs text-destructive">{err}</p>}
    </section>
  );
}

// ─── import CSV modal ─────────────────────────────────────────────────────────

type ImportCsvState =
  | { phase: 'preview'; preview: PreviewResult }
  | { phase: 'executing' }
  | { phase: 'done'; result: ExecuteResult };

interface ImportCsvModalProps {
  state: ImportCsvState;
  onConfirm: () => void;
  onClose: () => void;
}

function ImportCsvModal({ state, onConfirm, onClose }: ImportCsvModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Anteprima import CSV"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="relative w-full max-w-md rounded-lg border border-border bg-background shadow-lg">

        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Import CSV</h2>
          {state.phase !== 'executing' && (
            <button
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Chiudi"
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">

          {state.phase === 'preview' && (() => {
            const { preview } = state;
            const hasNew =
              preview.nuove_entita.categorie.length > 0 ||
              preview.nuove_entita.metodi.length > 0 ||
              preview.nuove_entita.dettagli.length > 0;
            return (
              <>
                <div className="flex gap-4">
                  <div className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-center">
                    <p className="text-lg font-semibold text-foreground">{preview.valide}</p>
                    <p className="text-xs text-muted-foreground">da importare</p>
                  </div>
                  <div className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-center">
                    <p className={cn('text-lg font-semibold', preview.saltate.length > 0 ? 'text-destructive' : 'text-foreground')}>
                      {preview.saltate.length}
                    </p>
                    <p className="text-xs text-muted-foreground">da saltare</p>
                  </div>
                </div>

                {hasNew && (
                  <div>
                    <p className={SECTION_LABEL}>Nuove entità che verranno create</p>
                    <div className="space-y-1">
                      {preview.nuove_entita.categorie.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Categorie: </span>
                          {preview.nuove_entita.categorie.map(n => (
                            <span key={n} className={cn(PILL, 'mr-1')}>{n}</span>
                          ))}
                        </div>
                      )}
                      {preview.nuove_entita.metodi.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Metodi: </span>
                          {preview.nuove_entita.metodi.map(n => (
                            <span key={n} className={cn(PILL, 'mr-1')}>{n}</span>
                          ))}
                        </div>
                      )}
                      {preview.nuove_entita.dettagli.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Dettagli: </span>
                          {preview.nuove_entita.dettagli.map(n => (
                            <span key={n} className={cn(PILL, 'mr-1')}>{n}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {preview.saltate.length > 0 && (
                  <div>
                    <p className={SECTION_LABEL}>Righe saltate</p>
                    <ul className="max-h-32 overflow-auto space-y-1 rounded-md border border-border bg-muted p-2">
                      {preview.saltate.map(s => (
                        <li key={s.row_num} className="text-xs">
                          <span className="font-medium text-foreground">Riga {s.row_num}:</span>{' '}
                          <span className="text-muted-foreground">{s.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}

          {state.phase === 'executing' && (
            <p className="py-4 text-center text-sm text-muted-foreground">Import in corso…</p>
          )}

          {state.phase === 'done' && (
            <>
              <div className="flex gap-4">
                <div className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-foreground">{state.result.importati}</p>
                  <p className="text-xs text-muted-foreground">importati</p>
                </div>
                <div className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-center">
                  <p className={cn('text-lg font-semibold', state.result.saltati.length > 0 ? 'text-destructive' : 'text-foreground')}>
                    {state.result.saltati.length}
                  </p>
                  <p className="text-xs text-muted-foreground">saltati</p>
                </div>
              </div>

              {state.result.saltati.length > 0 && (
                <div>
                  <p className={SECTION_LABEL}>Righe saltate</p>
                  <ul className="max-h-32 overflow-auto space-y-1 rounded-md border border-border bg-muted p-2">
                    {state.result.saltati.map(s => (
                      <li key={s.row_num} className="text-xs">
                        <span className="font-medium text-foreground">Riga {s.row_num}:</span>{' '}
                        <span className="text-muted-foreground">{s.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          {state.phase === 'preview' && (
            <>
              <button onClick={onClose} className={BTN_MUTED}>Annulla</button>
              <button
                onClick={onConfirm}
                disabled={state.preview.valide === 0}
                className={BTN_PRIMARY}
              >
                Importa {state.preview.valide} moviment{state.preview.valide === 1 ? 'o' : 'i'}
              </button>
            </>
          )}
          {state.phase === 'done' && (
            <button onClick={onClose} className={BTN_PRIMARY}>Chiudi</button>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function ResocontoImpostazioniScreen() {
  const {
    categorie, metodi, dettagli,
    syncCategorie, createCategoria, deleteCategoria,
    syncMetodi, createMetodo, deleteMetodo,
    syncDettagli, createDettaglio, deleteDettaglio, updateDettaglioCategoria,
  } = useLookupStore();

  const [valuta, setValuta] = useState('');
  const [saldoImporto, setSaldoImporto] = useState('');
  const [saldoData, setSaldoData] = useState('');
  const [prefStatus, setPrefStatus] = useState<StatusMsg | null>(null);
  const [csvStatus, setCsvStatus] = useState<StatusMsg | null>(null);
  const [loadingOp, setLoadingOp] = useState<'csv' | 'importCsv' | null>(null);
  const [importCsvModal, setImportCsvModal] = useState<ImportCsvState | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [v, si, sid] = await Promise.all([
          window.electronAPI.impostazioni.get(IMPOSTAZIONI_KEYS.valuta),
          window.electronAPI.impostazioni.get(IMPOSTAZIONI_KEYS.saldoImporto),
          window.electronAPI.impostazioni.get(IMPOSTAZIONI_KEYS.saldoData),
        ]);
        if (v) setValuta(v);
        if (si) setSaldoImporto(si);
        if (sid) setSaldoData(sid);
      } catch (err) {
        console.error('Failed to load preferenze:', err);
      }
    })();
    void (async () => {
      try {
        await Promise.all([syncCategorie(), syncMetodi(), syncDettagli()]);
      } catch (err) {
        console.error('Failed to sync lookup data:', err);
      }
    })();
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
    setCsvStatus(null);
    try {
      const result = await window.electronAPI.fileOps.exportCsv();
      setCsvStatus(result ? { type: 'success', text: `CSV salvato in: ${result.path}` } : null);
    } catch (err) {
      setCsvStatus({ type: 'error', text: `Errore export CSV: ${String(err)}` });
    } finally {
      setLoadingOp(null);
    }
  }

  async function handleImportCsv() {
    setLoadingOp('importCsv');
    setCsvStatus(null);
    try {
      const preview = await window.electronAPI.fileOps.importCsvPreview();
      if (!preview) return;
      setImportCsvModal({ phase: 'preview', preview });
    } catch (err) {
      setCsvStatus({ type: 'error', text: `Errore analisi CSV: ${String(err)}` });
    } finally {
      setLoadingOp(null);
    }
  }

  async function handleImportCsvConfirm() {
    if (!importCsvModal || importCsvModal.phase !== 'preview') return;
    const { filePath } = importCsvModal.preview;
    setImportCsvModal({ phase: 'executing' });
    try {
      const result = await window.electronAPI.fileOps.importCsvExecute(filePath);
      setImportCsvModal({ phase: 'done', result });
    } catch (err) {
      setImportCsvModal(null);
      setCsvStatus({ type: 'error', text: `Errore import CSV: ${String(err)}` });
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
    <div className="space-y-8">
      {importCsvModal && (
        <ImportCsvModal
          state={importCsvModal}
          onConfirm={() => { void handleImportCsvConfirm(); }}
          onClose={() => setImportCsvModal(null)}
        />
      )}

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

      {/* Dettagli */}
      <DettagliList
        items={dettagli}
        categorie={categorie}
        onAdd={createDettaglio}
        onDelete={deleteDettaglio}
        onUpdateCategoria={updateDettaglioCategoria}
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

      {/* Esporta / Importa CSV */}
      <section aria-labelledby="csv-heading">
        <SectionHeading id="csv-heading">CSV</SectionHeading>
        <SectionDesc>Esporta tutti i movimenti o importa da un file CSV.</SectionDesc>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { void handleExportCsv(); }}
            disabled={loadingOp !== null}
            className={BTN_MUTED}
          >
            {loadingOp === 'csv' ? 'Esportazione…' : 'Esporta CSV'}
          </button>
          <button
            onClick={() => { void handleImportCsv(); }}
            disabled={loadingOp !== null}
            className={BTN_MUTED}
          >
            {loadingOp === 'importCsv' ? 'Analisi…' : 'Importa CSV'}
          </button>
        </div>
        <StatusLine msg={csvStatus} />
      </section>
    </div>
  );
}
