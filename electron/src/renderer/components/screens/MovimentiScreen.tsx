import { useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent, ValueFormatterParams } from 'ag-grid-community';
import { Inbox, Plus, Trash2, X } from 'lucide-react';
import { useThemeStore, getResolvedTheme } from '@/stores/theme';
import { getAgGridTheme } from '@/lib/ag-theme';
import { useMovimentiStore } from '@/stores/movimenti';
import { useLookupStore } from '@/stores/lookup';
import type { MovimentoWithLookup } from '@/types/movimento';
import MovimentoDialog from '@/components/MovimentoDialog';

type DialogState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; movimento: MovimentoWithLookup };

const ANNI = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

const MESI = [
  { value: 1, label: 'Gennaio' },
  { value: 2, label: 'Febbraio' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Aprile' },
  { value: 5, label: 'Maggio' },
  { value: 6, label: 'Giugno' },
  { value: 7, label: 'Luglio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Settembre' },
  { value: 10, label: 'Ottobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Dicembre' },
];

const EURO_FMT = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

function formatData(iso: string): string {
  try {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}

function TipoCellRenderer({ value }: ICellRendererParams) {
  const isEntrata = value === 'entrata';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isEntrata
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {isEntrata ? 'Entrata' : 'Uscita'}
    </span>
  );
}

function EmptyState() {
  return (
    <div
      role="status"
      className="flex h-full flex-col items-center justify-center gap-3 text-center"
    >
      <Inbox size={40} className="text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">Nessun movimento</p>
      <p className="text-xs text-muted-foreground">I movimenti inseriti appariranno qui.</p>
    </div>
  );
}

const SELECT_CLS =
  'h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const INPUT_CLS =
  'h-8 w-40 rounded-md border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function MovimentiScreen() {
  const { theme } = useThemeStore();
  const isDark = getResolvedTheme(theme) === 'dark';
  const gridTheme = useMemo(() => getAgGridTheme(isDark), [isDark]);

  const { movimenti, filters, loading, fetch, setFilter, resetFilters, deleteAll } = useMovimentiStore();
  const { categorie, metodi, syncCategorie, syncMetodi } = useLookupStore();
  const [testoInput, setTestoInput] = useState(filters.testo ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    fetch();
    syncCategorie();
    syncMetodi();
  }, [fetch, syncCategorie, syncMetodi]);

  const hasFilters = Object.values(filters).some(
    (v) => v != null && v !== '',
  ) || testoInput !== '';

  function handleTestoChange(val: string) {
    setTestoInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilter({ testo: val || undefined });
    }, 300);
  }

  function handleReset() {
    setTestoInput('');
    resetFilters();
  }

  async function handleConfirmDeleteAll() {
    setDeletingAll(true);
    try {
      await deleteAll();
    } catch {
      // error surfaced via store.error
    } finally {
      setDeletingAll(false);
      setConfirmDeleteAll(false);
    }
  }

  const colDefs = useMemo<ColDef<MovimentoWithLookup>[]>(
    () => [
      {
        field: 'data',
        headerName: 'Data',
        flex: 1,
        minWidth: 100,
        valueFormatter: (p: ValueFormatterParams) =>
          p.value ? formatData(p.value as string) : '',
      },
      {
        field: 'tipo',
        headerName: 'Tipo',
        flex: 1,
        minWidth: 100,
        cellRenderer: TipoCellRenderer,
      },
      {
        field: 'importo',
        headerName: 'Importo',
        flex: 1,
        minWidth: 110,
        type: 'numericColumn',
        valueFormatter: (p: ValueFormatterParams) =>
          p.value != null ? EURO_FMT.format(p.value as number) : '',
      },
      {
        field: 'categoria_nome',
        headerName: 'Categoria',
        flex: 1.5,
        minWidth: 120,
        valueFormatter: (p: ValueFormatterParams) =>
          (p.value as string | null) ?? '—',
      },
      {
        field: 'metodo_nome',
        headerName: 'Metodo',
        flex: 1.5,
        minWidth: 120,
        valueFormatter: (p: ValueFormatterParams) =>
          (p.value as string | null) ?? '—',
      },
      {
        field: 'descrizione',
        headerName: 'Nota',
        flex: 2,
        minWidth: 150,
        valueFormatter: (p: ValueFormatterParams) =>
          (p.value as string | null) ?? '',
      },
    ],
    [],
  );

  function handleRowDoubleClick(e: RowDoubleClickedEvent<MovimentoWithLookup>) {
    if (e.data) setDialog({ open: true, mode: 'edit', movimento: e.data });
  }

  return (
    <>
    <MovimentoDialog
      open={dialog.open}
      mode={dialog.open ? dialog.mode : 'create'}
      movimento={dialog.open && dialog.mode === 'edit' ? dialog.movimento : undefined}
      onClose={() => setDialog({ open: false })}
    />

    {confirmDeleteAll && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-all-title"
      >
        <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg">
          <h2 id="confirm-delete-all-title" className="text-sm font-semibold text-foreground">
            Conferma eliminazione
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Stai per eliminare{' '}
            <span className="font-medium text-foreground">
              {movimenti.length} {movimenti.length === 1 ? 'movimento' : 'movimenti'}
            </span>
            . L&apos;operazione può essere annullata tramite il toast.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDeleteAll(false)}
              disabled={deletingAll}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              onClick={handleConfirmDeleteAll}
              disabled={deletingAll}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <Trash2 size={12} aria-hidden />
              {deletingAll ? 'Eliminazione…' : 'Elimina'}
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="flex h-full flex-col gap-4">
      {/* Header + filtri */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Tutti i movimenti</h2>
        <button
          onClick={() => setDialog({ open: true, mode: 'create' })}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Nuovo movimento"
        >
          <Plus size={13} aria-hidden />
          Nuovo movimento
        </button>
        {movimenti.length > 0 && (
          <button
            onClick={() => setConfirmDeleteAll(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/60 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Elimina movimenti mostrati"
          >
            <Trash2 size={13} aria-hidden />
            Elimina mostrati
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            aria-label="Anno"
            value={filters.anno ?? ''}
            onChange={(e) =>
              setFilter({ anno: e.target.value ? Number(e.target.value) : undefined })
            }
            className={SELECT_CLS}
          >
            <option value="">Tutti gli anni</option>
            {ANNI.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            aria-label="Mese"
            value={filters.mese ?? ''}
            onChange={(e) =>
              setFilter({ mese: e.target.value ? Number(e.target.value) : undefined })
            }
            className={SELECT_CLS}
          >
            <option value="">Tutti i mesi</option>
            {MESI.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Tipo"
            value={filters.tipo ?? ''}
            onChange={(e) =>
              setFilter({
                tipo: (e.target.value as 'entrata' | 'uscita') || undefined,
              })
            }
            className={SELECT_CLS}
          >
            <option value="">Tutti i tipi</option>
            <option value="entrata">Entrata</option>
            <option value="uscita">Uscita</option>
          </select>

          <select
            aria-label="Categoria"
            value={filters.categoria_id ?? ''}
            onChange={(e) =>
              setFilter({
                categoria_id: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={SELECT_CLS}
          >
            <option value="">Tutte le categorie</option>
            {categorie.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <select
            aria-label="Metodo di pagamento"
            value={filters.metodo_id ?? ''}
            onChange={(e) =>
              setFilter({
                metodo_id: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={SELECT_CLS}
          >
            <option value="">Tutti i metodi</option>
            {metodi.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>

          <input
            type="search"
            aria-label="Cerca nella nota"
            placeholder="Cerca nota…"
            value={testoInput}
            onChange={(e) => handleTestoChange(e.target.value)}
            className={INPUT_CLS}
          />

          {hasFilters && (
            <button
              onClick={handleReset}
              aria-label="Rimuovi tutti i filtri"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X size={12} aria-hidden />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Griglia */}
      <div
        className="flex-1 min-h-96 rounded-lg border border-border overflow-hidden"
        aria-busy={loading}
      >
        {!loading && movimenti.length === 0 ? (
          <EmptyState />
        ) : (
          <AgGridReact<MovimentoWithLookup>
            theme={gridTheme}
            rowData={movimenti}
            columnDefs={colDefs}
            loading={loading}
            defaultColDef={{ sortable: true, resizable: true }}
            onRowDoubleClicked={handleRowDoubleClick}
          />
        )}
      </div>
    </div>
    </>
  );
}
