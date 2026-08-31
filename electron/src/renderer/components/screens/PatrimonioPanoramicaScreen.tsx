import { Fragment, useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, Plus, X, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatrimonioStore } from '@/stores/patrimonio';
import type { KpiPatrimonio, PatrimonioGruppo, PatrimonioVoce, PatrimonioValore } from '../../../ipc/types';

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const FIELD_CLS =
  'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const LABEL_CLS = 'block text-xs font-medium text-muted-foreground mb-1';
const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring';
const BTN_GHOST =
  'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

function formatImporto(importo: number): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(importo);
}

function getRawCellValue(valori: PatrimonioValore[], voceId: number, mese: number): number | null {
  const v = valori.find((x) => x.voce_id === voceId && x.mese === mese);
  return v != null ? v.importo : null;
}

function formatOrDash(raw: number | null): string {
  return raw != null ? formatImporto(raw) : '—';
}

// --- KPI ---

interface KpiTileProps {
  label: string;
  value: number;
  colorCls?: string;
}

function KpiTile({ label, value, colorCls }: KpiTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn('text-2xl font-semibold tabular-nums', colorCls ?? 'text-foreground')}>
        {formatImporto(value)}
      </span>
    </div>
  );
}

function PatrimonioKpiRow({ kpi }: { kpi: KpiPatrimonio }) {
  const nettoColor =
    kpi.patrimonioNetto >= 0
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="grid grid-cols-3 gap-4" aria-label="KPI patrimonio">
      <KpiTile label="Totale Attivi" value={kpi.totaleAttivi} colorCls="text-green-600 dark:text-green-400" />
      <KpiTile label="Totale Passivi" value={kpi.totalePassivi} colorCls="text-red-600 dark:text-red-400" />
      <KpiTile label="Patrimonio Netto" value={kpi.patrimonioNetto} colorCls={nettoColor} />
    </div>
  );
}

// --- Inline cell ---

interface InlineCellProps {
  voceId: number;
  mese: number;
  valori: PatrimonioValore[];
  onSave: (voceId: number, mese: number, value: number | null) => Promise<void>;
}

function InlineCell({ voceId, mese, valori, onSave }: InlineCellProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  const raw = getRawCellValue(valori, voceId, mese);
  const display = raw != null ? formatImporto(raw) : '—';

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    cancelRef.current = false;
    setInputValue(raw != null ? String(raw) : '');
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  }

  async function commit() {
    if (cancelRef.current) return;
    setEditing(false);
    const trimmed = inputValue.trim();
    const num = trimmed === '' ? NaN : parseFloat(trimmed.replace(',', '.'));
    try {
      await onSave(voceId, mese, isNaN(num) ? null : num);
    } catch {
      // error surfaced via store
    }
  }

  function cancel() {
    cancelRef.current = true;
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      cancel();
    }
  }

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        title="Clicca per modificare"
        onClick={startEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') startEdit(e as unknown as React.MouseEvent);
        }}
        className="block cursor-text text-right tabular-nums text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
      >
        {display}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      step="any"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      className="w-full rounded border border-ring bg-background px-1 py-0.5 text-right text-xs tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    />
  );
}

// --- GruppoCombobox ---

interface GruppoComboboxProps {
  gruppi: PatrimonioGruppo[];
  value: string;
  onChange: (nome: string) => void;
  onCreate?: (nome: string) => Promise<unknown>;
  inputId?: string;
}

function GruppoCombobox({ gruppi, value, onChange, onCreate, inputId = 'voce-gruppo' }: GruppoComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = gruppi.filter((g) =>
    g.nome.toLowerCase().includes(value.toLowerCase()),
  );
  const exactMatch = gruppi.some((g) => g.nome.toLowerCase() === value.trim().toLowerCase());
  const showCreate = value.trim() !== '' && !exactMatch;

  function handleBlur() {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 150);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Cerca o crea gruppo…"
          className={FIELD_CLS + ' pr-8'}
          aria-autocomplete="list"
          aria-expanded={open}
          role="combobox"
        />
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-48 overflow-y-auto"
        >
          {filtered.length === 0 && !showCreate && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Nessun gruppo trovato</div>
          )}
          {filtered.map((g) => (
            <button
              key={g.id}
              type="button"
              role="option"
              aria-selected={g.nome.toLowerCase() === value.toLowerCase()}
              onMouseDown={(e) => { e.preventDefault(); onChange(g.nome); setOpen(false); }}
              className={cn(
                'w-full px-3 py-2 text-sm text-left hover:bg-accent text-foreground',
                g.nome.toLowerCase() === value.toLowerCase() && 'bg-accent/50',
              )}
            >
              {g.nome}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              role="option"
              onMouseDown={async (e) => {
                e.preventDefault();
                setOpen(false);
                if (onCreate) await onCreate(value.trim());
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent text-muted-foreground border-t border-border"
            >
              Crea &ldquo;{value.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// --- VoceDialog ---

interface VoceDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  defaultTipo: 'attivo' | 'passivo';
  voce?: PatrimonioVoce;
  gruppoNomeIniziale?: string;
  gruppi: PatrimonioGruppo[];
  onClose: () => void;
  onSave: (nome: string, tipo: 'attivo' | 'passivo', gruppo: string) => Promise<void>;
  onCreateGruppo: (nome: string, tipo: 'attivo' | 'passivo') => Promise<PatrimonioGruppo>;
}

function VoceDialog({ open, mode, defaultTipo, voce, gruppoNomeIniziale = '', gruppi, onClose, onSave, onCreateGruppo }: VoceDialogProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'attivo' | 'passivo'>(defaultTipo);
  const [gruppo, setGruppo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const nomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setNome(voce?.nome ?? '');
    setTipo(voce?.tipo ?? defaultTipo);
    setGruppo(gruppoNomeIniziale);
    setError('');
    setSaving(false);
    setTimeout(() => nomeRef.current?.focus(), 50);
  }, [open, voce, defaultTipo, gruppoNomeIniziale]);

  const gruppiPerTipo = gruppi.filter((g) => g.tipo === tipo);

  async function handleSave() {
    const trimmed = nome.trim();
    if (!trimmed) {
      setError('Il nome è obbligatorio.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(trimmed, tipo, gruppo.trim());
      onClose();
    } catch {
      setError('Salvataggio fallito. Riprova.');
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !saving) handleSave();
    if (e.key === 'Escape') onClose();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Aggiungi voce' : 'Modifica voce'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            {mode === 'create' ? 'Aggiungi voce' : 'Modifica voce'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="voce-nome" className={LABEL_CLS}>
              Nome
            </label>
            <input
              id="voce-nome"
              ref={nomeRef}
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={FIELD_CLS}
              placeholder="Es. Conto corrente"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div>
            <label htmlFor="voce-tipo" className={LABEL_CLS}>
              Tipo
            </label>
            <select
              id="voce-tipo"
              value={tipo}
              onChange={(e) => { setTipo(e.target.value as 'attivo' | 'passivo'); setGruppo(''); }}
              className={FIELD_CLS}
            >
              <option value="attivo">Attivo</option>
              <option value="passivo">Passivo</option>
            </select>
          </div>

          <div>
            <label htmlFor="voce-gruppo" className={LABEL_CLS}>
              Gruppo (opzionale)
            </label>
            <GruppoCombobox
              gruppi={gruppiPerTipo}
              value={gruppo}
              onChange={setGruppo}
              onCreate={(nome) => onCreateGruppo(nome, tipo)}
              inputId="voce-gruppo"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className={BTN_GHOST}>
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
            {saving ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- DeleteGruppoDialog ---

interface DeleteGruppoDialogProps {
  gruppo: PatrimonioGruppo;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function DeleteGruppoDialog({ gruppo, onConfirm, onCancel }: DeleteGruppoDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirm();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Elimina gruppo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Elimina gruppo</h2>
          <button onClick={onCancel} aria-label="Chiudi" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-foreground mb-1">
          Elimina il gruppo <span className="font-semibold">&ldquo;{gruppo.nome}&rdquo;</span>?
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Le voci del gruppo diventeranno senza gruppo. I dati non vengono persi.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className={BTN_GHOST}>Annulla</button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-4 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {deleting ? 'Elimino…' : 'Elimina'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- VoceTable ---

interface VoceTableProps {
  tipo: 'attivo' | 'passivo';
  voci: PatrimonioVoce[];
  gruppi: PatrimonioGruppo[];
  valori: PatrimonioValore[];
  granularita: 'mese' | 'quarter';
  mostraArchiviate: boolean;
  onEdit: (voce: PatrimonioVoce) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onReorder: (id: number, direction: 'up' | 'down') => void;
  onCellSave: (voceId: number, mese: number, value: number | null) => Promise<void>;
  onRenameGruppo: (id: number, nome: string) => Promise<void>;
  onDeleteGruppo: (gruppo: PatrimonioGruppo) => void;
}

type RenamingState = { id: number; input: string };

function VoceTable({
  tipo,
  voci,
  gruppi,
  valori,
  granularita,
  mostraArchiviate,
  onEdit,
  onArchive,
  onRestore,
  onReorder,
  onCellSave,
  onRenameGruppo,
  onDeleteGruppo,
}: VoceTableProps) {
  const [renaming, setRenaming] = useState<RenamingState | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const attive = voci
    .filter((v) => v.tipo === tipo && v.attiva === 1)
    .sort((a, b) => a.ordine - b.ordine || a.id - b.id);

  const archiviate = mostraArchiviate
    ? voci.filter((v) => v.tipo === tipo && v.attiva === 0).sort((a, b) => a.id - b.id)
    : [];

  const periodi = granularita === 'mese' ? MESI : QUARTERS;
  const periodiMesi = granularita === 'mese'
    ? MESI.map((_, i) => i + 1)
    : QUARTERS.map((_, i) => (i + 1) * 3);

  const gruppiDelTipo = gruppi
    .filter((g) => g.tipo === tipo)
    .sort((a, b) => a.ordine - b.ordine || a.id - b.id);

  const vociPerGruppo = new Map<number | null, PatrimonioVoce[]>();
  for (const v of attive) {
    const gid = v.gruppo_id ?? null;
    if (!vociPerGruppo.has(gid)) vociPerGruppo.set(gid, []);
    vociPerGruppo.get(gid)!.push(v);
  }
  const ungrouped = vociPerGruppo.get(null) ?? [];

  function getSubtotal(vociGruppo: PatrimonioVoce[], mese: number): number | null {
    let total = 0;
    let hasAny = false;
    for (const v of vociGruppo) {
      const raw = getRawCellValue(valori, v.id, mese);
      if (raw != null) { total += raw; hasAny = true; }
    }
    return hasAny ? total : null;
  }

  function startRename(gruppo: PatrimonioGruppo) {
    setRenaming({ id: gruppo.id, input: gruppo.nome });
    setMenuOpen(null);
    setTimeout(() => renameInputRef.current?.focus(), 30);
  }

  async function commitRename() {
    if (!renaming) return;
    const trimmed = renaming.input.trim();
    setRenaming(null);
    if (!trimmed) return;
    try {
      await onRenameGruppo(renaming.id, trimmed);
    } catch {
      // error surfaced via store
    }
  }

  function renderVoceRow(voce: PatrimonioVoce, indented: boolean) {
    const archiviata = voce.attiva === 0;
    const idxInAttive = attive.findIndex((v) => v.id === voce.id);
    return (
      <tr
        key={voce.id}
        className={cn(
          'border-b border-border last:border-0 transition-colors',
          archiviata ? 'opacity-50' : 'hover:bg-accent/30',
        )}
      >
        <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-0.5">
            {!archiviata && (
              <>
                <button
                  aria-label="Sposta su"
                  onClick={() => onReorder(voce.id, 'up')}
                  disabled={idxInAttive === 0}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  aria-label="Sposta giù"
                  onClick={() => onReorder(voce.id, 'down')}
                  disabled={idxInAttive === attive.length - 1}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronDown size={13} />
                </button>
              </>
            )}
            {archiviata ? (
              <button
                aria-label="Ripristina voce"
                onClick={() => onRestore(voce.id)}
                className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
              >
                Ripristina
              </button>
            ) : (
              <button
                aria-label="Archivia voce"
                onClick={() => onArchive(voce.id)}
                className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Archivia
              </button>
            )}
          </div>
        </td>
        <td
          className={cn(
            'px-3 py-1.5 font-medium text-foreground',
            indented && 'pl-6',
            !archiviata && 'cursor-pointer hover:underline',
          )}
          onClick={archiviata ? undefined : () => onEdit(voce)}
        >
          {voce.nome}
        </td>
        {periodiMesi.map((mese, i) => (
          <td key={i} className="px-2 py-1.5">
            {archiviata ? (
              <span className="block text-right tabular-nums text-muted-foreground">
                {formatOrDash(getRawCellValue(valori, voce.id, mese))}
              </span>
            ) : (
              <InlineCell voceId={voce.id} mese={mese} valori={valori} onSave={onCellSave} />
            )}
          </td>
        ))}
      </tr>
    );
  }

  if (attive.length === 0 && archiviate.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">Nessuna voce.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="w-20 px-2 py-2 text-left font-medium text-muted-foreground">Azioni</th>
            <th className="min-w-[140px] px-3 py-2 text-left font-medium text-muted-foreground">
              Voce
            </th>
            {periodi.map((p) => (
              <th key={p} className="min-w-[72px] px-2 py-2 text-right font-medium text-muted-foreground">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Gruppi con voci */}
          {gruppiDelTipo.map((gruppo) => {
            const vociGruppo = vociPerGruppo.get(gruppo.id) ?? [];
            if (vociGruppo.length === 0) return null;
            const isRenaming = renaming?.id === gruppo.id;
            const isMenuOpen = menuOpen === gruppo.id;

            return (
              <Fragment key={`g-${gruppo.id}`}>
                {/* Group header */}
                <tr
                  className="group/row border-b border-border bg-muted/25"
                  onContextMenu={(e) => { e.preventDefault(); setMenuOpen(isMenuOpen ? null : gruppo.id); }}
                >
                  <td className="px-2 py-1.5">
                    <div className="relative">
                      <button
                        aria-label={`Opzioni gruppo ${gruppo.nome}`}
                        onClick={() => setMenuOpen(isMenuOpen ? null : gruppo.id)}
                        className={cn(
                          'rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring',
                          !isMenuOpen && 'opacity-0 group-hover/row:opacity-100 focus:opacity-100',
                        )}
                      >
                        <MoreVertical size={13} />
                      </button>
                      {isMenuOpen && (
                        <div
                          role="menu"
                          className="absolute left-0 top-full z-50 mt-1 w-32 rounded-md border border-border bg-card shadow-lg"
                        >
                          <button
                            role="menuitem"
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent text-foreground"
                            onClick={() => startRename(gruppo)}
                          >
                            Rinomina
                          </button>
                          <button
                            role="menuitem"
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent text-destructive"
                            onClick={() => { onDeleteGruppo(gruppo); setMenuOpen(null); }}
                          >
                            Elimina
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    colSpan={periodi.length + 1}
                    className="px-3 py-1.5"
                  >
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renaming.input}
                        onChange={(e) => setRenaming({ id: gruppo.id, input: e.target.value })}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        className="rounded border border-ring bg-background px-2 py-0.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-full max-w-[200px]"
                        aria-label="Rinomina gruppo"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-foreground">{gruppo.nome}</span>
                    )}
                  </td>
                </tr>

                {/* Voci del gruppo */}
                {vociGruppo.map((voce) => renderVoceRow(voce, true))}

                {/* Subtotale */}
                <tr className="border-b border-border bg-muted/10">
                  <td />
                  <td className="px-3 py-1.5 pl-6 text-xs font-medium text-muted-foreground italic">
                    Subtotale
                  </td>
                  {periodiMesi.map((mese, i) => {
                    const sub = getSubtotal(vociGruppo, mese);
                    return (
                      <td key={i} className="px-2 py-1.5 text-right tabular-nums text-xs font-medium text-muted-foreground">
                        {sub != null ? formatImporto(sub) : '—'}
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            );
          })}

          {/* Voci senza gruppo */}
          {ungrouped.map((voce) => renderVoceRow(voce, false))}

          {/* Archiviate */}
          {archiviate.map((voce) => renderVoceRow(voce, false))}
        </tbody>
      </table>
    </div>
  );
}

// --- Screen ---

interface DialogState {
  open: boolean;
  mode: 'create' | 'edit';
  defaultTipo: 'attivo' | 'passivo';
  voce?: PatrimonioVoce;
  gruppoNome?: string;
}

export default function PatrimonioPanoramicaScreen() {
  const {
    anno,
    granularita,
    voci,
    gruppi,
    valori,
    kpi,
    mostraArchiviate,
    fetchVoci,
    addVoce,
    editVoce,
    archiveVoce,
    restoreVoce,
    reorderVoce,
    upsertValore,
    deleteValore,
    toggleMostraArchiviate,
    createGruppo,
    updateGruppo,
    deleteGruppo,
  } = usePatrimonioStore();

  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    mode: 'create',
    defaultTipo: 'attivo',
  });

  const [deletingGruppo, setDeletingGruppo] = useState<PatrimonioGruppo | null>(null);

  useEffect(() => {
    fetchVoci(anno);
  }, [anno, granularita, fetchVoci]);

  function openCreate(tipo: 'attivo' | 'passivo') {
    setDialog({ open: true, mode: 'create', defaultTipo: tipo });
  }

  function openEdit(voce: PatrimonioVoce) {
    const gruppoNome = gruppi.find((g) => g.id === voce.gruppo_id)?.nome ?? '';
    setDialog({ open: true, mode: 'edit', defaultTipo: voce.tipo, voce, gruppoNome });
  }

  function closeDialog() {
    setDialog((d) => ({ ...d, open: false }));
  }

  async function handleSave(nome: string, tipo: 'attivo' | 'passivo', gruppo: string) {
    if (dialog.mode === 'create') {
      await addVoce(nome, tipo, gruppo || undefined);
    } else if (dialog.voce) {
      await editVoce(dialog.voce.id, nome, gruppo);
    }
  }

  async function handleCellSave(voceId: number, mese: number, value: number | null) {
    if (value === null) {
      await deleteValore(voceId, mese);
    } else {
      await upsertValore(voceId, mese, value);
    }
  }

  async function handleDeleteGruppoConfirm() {
    if (!deletingGruppo) return;
    try {
      await deleteGruppo(deletingGruppo.id);
      setDeletingGruppo(null);
    } catch {
      setDeletingGruppo(null);
    }
  }

  return (
    <>
      <VoceDialog
        open={dialog.open}
        mode={dialog.mode}
        defaultTipo={dialog.defaultTipo}
        voce={dialog.voce}
        gruppoNomeIniziale={dialog.gruppoNome}
        gruppi={gruppi}
        onClose={closeDialog}
        onSave={handleSave}
        onCreateGruppo={createGruppo}
      />

      {deletingGruppo && (
        <DeleteGruppoDialog
          gruppo={deletingGruppo}
          onConfirm={handleDeleteGruppoConfirm}
          onCancel={() => setDeletingGruppo(null)}
        />
      )}

      <div className="space-y-6">
        {kpi && <PatrimonioKpiRow kpi={kpi} />}

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={mostraArchiviate}
              onChange={toggleMostraArchiviate}
              className="rounded border-border"
            />
            Mostra archiviate
          </label>
        </div>

        <section aria-label="Attivi">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Attivi</h2>
            <button
              onClick={() => openCreate('attivo')}
              aria-label="Aggiungi voce attivo"
              className={cn(
                'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs',
                'text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
              )}
            >
              <Plus size={12} />
              Aggiungi
            </button>
          </div>
          <VoceTable
            tipo="attivo"
            voci={voci}
            gruppi={gruppi}
            valori={valori}
            granularita={granularita}
            mostraArchiviate={mostraArchiviate}
            onEdit={openEdit}
            onArchive={archiveVoce}
            onRestore={restoreVoce}
            onReorder={reorderVoce}
            onCellSave={handleCellSave}
            onRenameGruppo={updateGruppo}
            onDeleteGruppo={setDeletingGruppo}
          />
        </section>

        <section aria-label="Passivi">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Passivi</h2>
            <button
              onClick={() => openCreate('passivo')}
              aria-label="Aggiungi voce passivo"
              className={cn(
                'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs',
                'text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
              )}
            >
              <Plus size={12} />
              Aggiungi
            </button>
          </div>
          <VoceTable
            tipo="passivo"
            voci={voci}
            gruppi={gruppi}
            valori={valori}
            granularita={granularita}
            mostraArchiviate={mostraArchiviate}
            onEdit={openEdit}
            onArchive={archiveVoce}
            onRestore={restoreVoce}
            onReorder={reorderVoce}
            onCellSave={handleCellSave}
            onRenameGruppo={updateGruppo}
            onDeleteGruppo={setDeletingGruppo}
          />
        </section>
      </div>
    </>
  );
}
