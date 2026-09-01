import { useEffect, useRef, useState } from 'react';
import { Trash2, Plus, X, Pencil } from 'lucide-react';
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
const BTN_GHOST_EDIT =
  'p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed';
const PILL = 'inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground';
const SECTION_LABEL = 'mb-1 text-xs font-semibold text-foreground';
const DEFAULT_COLORE = '#6b7280';
const INPUT_CLS = cn(
  'flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm',
  'text-foreground placeholder:text-muted-foreground',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

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

// ─── CategoriaFields ─────────────────────────────────────────────────────────

interface CategoriaFieldsProps {
  nome: string;
  colore: string;
  icona: string;
  onNome: (v: string) => void;
  onColore: (v: string) => void;
  onIcona: (v: string) => void;
  nomeRef?: React.RefObject<HTMLInputElement | null>;
}

function CategoriaFields({ nome, colore, icona, onNome, onColore, onIcona, nomeRef }: CategoriaFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="cat-nome">
          Nome <span aria-hidden>*</span>
        </label>
        <input
          id="cat-nome"
          ref={nomeRef}
          type="text"
          value={nome}
          onChange={(e) => onNome(e.target.value)}
          placeholder="Es. Trasporti"
          required
          className={cn(INPUT_CLS, 'w-full flex-none')}
        />
      </div>
      <div className="flex gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="cat-colore">
            Colore
          </label>
          <input
            id="cat-colore"
            type="color"
            value={colore}
            onChange={(e) => onColore(e.target.value)}
            className="h-8 w-16 cursor-pointer rounded border border-border bg-background p-0.5"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="cat-icona">
            Icona (emoji)
          </label>
          <input
            id="cat-icona"
            type="text"
            value={icona}
            onChange={(e) => onIcona(e.target.value)}
            placeholder="🏠"
            maxLength={4}
            className={cn(INPUT_CLS, 'w-full flex-none')}
          />
        </div>
      </div>
    </div>
  );
}

// ─── EditCategoriaDialog ─────────────────────────────────────────────────────

interface EditCategoriaDialogProps {
  cat: Categoria;
  onSave: (id: number, nome: string, colore: string | undefined, icona: string | undefined) => Promise<void>;
  onClose: () => void;
}

function EditCategoriaDialog({ cat, onSave, onClose }: EditCategoriaDialogProps) {
  const [nome, setNome] = useState(cat.nome);
  const [colore, setColore] = useState(cat.colore ?? DEFAULT_COLORE);
  const [icona, setIcona] = useState(cat.icona ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nomeRef.current?.focus();
  }, []);

  async function handleSave() {
    const n = nome.trim();
    if (!n) return;
    setSaving(true);
    setErr(null);
    try {
      await onSave(cat.id, n, colore || undefined, icona.trim() || undefined);
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-cat-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id="edit-cat-title" className="text-sm font-semibold text-foreground">Modifica categoria</h2>
          <button onClick={onClose} aria-label="Chiudi" className={BTN_GHOST_EDIT}>
            <X size={14} aria-hidden />
          </button>
        </div>
        <form
          className="px-5 py-4"
          onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
        >
          <CategoriaFields
            nome={nome}
            colore={colore}
            icona={icona}
            onNome={setNome}
            onColore={setColore}
            onIcona={setIcona}
            nomeRef={nomeRef}
          />
          {err && <p role="alert" className="mt-3 text-xs text-destructive">{err}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className={BTN_MUTED}>Annulla</button>
            <button type="submit" disabled={saving || !nome.trim()} className={BTN_PRIMARY}>
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DeleteCategoriaModal ────────────────────────────────────────────────────

type DeleteCategoriaMode = 'existing' | 'new';

interface DeleteCategoriaModalProps {
  cat: Categoria;
  altreCategorie: Categoria[];
  onConfirm: (targetId: number) => Promise<void>;
  onConfirmNew: (nome: string, colore: string | undefined, icona: string | undefined) => Promise<number>;
  onDeleteWithTarget: (id: number, targetId: number) => Promise<void>;
  onClose: () => void;
}

function DeleteCategoriaModal({
  cat,
  altreCategorie,
  onConfirm,
  onConfirmNew,
  onDeleteWithTarget,
  onClose,
}: DeleteCategoriaModalProps) {
  const hasOthers = altreCategorie.length > 0;
  const [mode, setMode] = useState<DeleteCategoriaMode>(hasOthers ? 'existing' : 'new');
  const [existingId, setExistingId] = useState<string>(hasOthers ? String(altreCategorie[0].id) : '');
  const [newNome, setNewNome] = useState('');
  const [newColore, setNewColore] = useState(DEFAULT_COLORE);
  const [newIcona, setNewIcona] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canConfirm =
    !busy &&
    (mode === 'existing' ? Boolean(existingId) : Boolean(newNome.trim()));

  async function handleConfirm() {
    if (!canConfirm) return;
    setBusy(true);
    setErr(null);
    try {
      if (mode === 'existing') {
        await onConfirm(Number(existingId));
      } else {
        const newId = await onConfirmNew(newNome.trim(), newColore || undefined, newIcona.trim() || undefined);
        await onDeleteWithTarget(cat.id, newId);
      }
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="del-cat-title"
      aria-describedby="del-cat-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id="del-cat-title" className="text-sm font-semibold text-foreground">
            Elimina «{cat.nome}»
          </h2>
          <button onClick={onClose} aria-label="Chiudi" className={BTN_GHOST_EDIT} disabled={busy}>
            <X size={14} aria-hidden />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p id="del-cat-desc" className="text-xs text-muted-foreground">
            Questa categoria ha movimenti associati. Scegli dove riassegnarli prima di eliminarla.
          </p>
          <fieldset className="space-y-3">
            <legend className="sr-only">Opzione di riassegnazione</legend>
            {hasOthers && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="del-mode"
                  value="existing"
                  checked={mode === 'existing'}
                  onChange={() => setMode('existing')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm text-foreground">Scegli esistente</span>
                  {mode === 'existing' && (
                    <select
                      value={existingId}
                      onChange={(e) => setExistingId(e.target.value)}
                      aria-label="Categoria destinazione"
                      className={cn(
                        'mt-2 block w-full rounded-md border border-border bg-background px-2 py-1 text-sm',
                        'text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    >
                      {altreCategorie.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            )}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="del-mode"
                value="new"
                checked={mode === 'new'}
                onChange={() => setMode('new')}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="text-sm text-foreground">Crea nuova</span>
                {mode === 'new' && (
                  <div className="mt-2">
                    <CategoriaFields
                      nome={newNome}
                      colore={newColore}
                      icona={newIcona}
                      onNome={setNewNome}
                      onColore={setNewColore}
                      onIcona={setNewIcona}
                    />
                  </div>
                )}
              </div>
            </label>
          </fieldset>
          {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} disabled={busy} className={BTN_MUTED}>Annulla</button>
          <button
            onClick={() => { void handleConfirm(); }}
            disabled={!canConfirm}
            className={cn(BTN_BASE, 'border-destructive bg-destructive text-destructive-foreground hover:opacity-90')}
          >
            {busy ? 'Conferma…' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EditDettaglioDialog ─────────────────────────────────────────────────────

interface EditDettaglioDialogProps {
  det: Dettaglio;
  categorie: Categoria[];
  onSave: (id: number, nome: string, categoria_id?: number) => Promise<void>;
  onClose: () => void;
}

function EditDettaglioDialog({ det, categorie, onSave, onClose }: EditDettaglioDialogProps) {
  const [nome, setNome] = useState(det.nome);
  const [categoriaId, setCategoriaId] = useState<string>(
    det.categoria_id != null ? String(det.categoria_id) : '',
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nomeRef.current?.focus();
  }, []);

  async function handleSave() {
    const n = nome.trim();
    if (!n) return;
    setSaving(true);
    setErr(null);
    try {
      await onSave(det.id, n, categoriaId ? Number(categoriaId) : undefined);
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-det-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id="edit-det-title" className="text-sm font-semibold text-foreground">Modifica dettaglio</h2>
          <button onClick={onClose} aria-label="Chiudi" className={BTN_GHOST_EDIT}>
            <X size={14} aria-hidden />
          </button>
        </div>
        <form
          className="px-5 py-4 space-y-3"
          onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="det-nome">
              Nome <span aria-hidden>*</span>
            </label>
            <input
              id="det-nome"
              ref={nomeRef}
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Supermercato"
              required
              className={cn(INPUT_CLS, 'w-full flex-none')}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="det-categoria">
              Categoria associata
            </label>
            <select
              id="det-categoria"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className={cn(
                'block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm',
                'text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <option value="">— Nessuna —</option>
              {categorie.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={BTN_MUTED}>Annulla</button>
            <button type="submit" disabled={saving || !nome.trim()} className={BTN_PRIMARY}>
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CategorieSection ─────────────────────────────────────────────────────────

interface PendingDeleteCategoria {
  cat: Categoria;
  count: number;
}

function CategorieSection() {
  const { categorie, syncCategorie, updateCategoria, createCategoria } = useLookupStore();
  const [editTarget, setEditTarget] = useState<Categoria | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteCategoria | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    const nome = input.trim();
    if (!nome) return;
    setAdding(true);
    setErr(null);
    try {
      await createCategoria(nome);
      setInput('');
      inputRef.current?.focus();
    } catch (e) {
      setErr(String(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteClick(cat: Categoria) {
    setErr(null);
    try {
      const count = await window.electronAPI.categorie.countMovimenti(cat.id);
      if (count === 0) {
        const others = categorie.filter((c) => c.id !== cat.id);
        if (others.length === 0) {
          setErr('Impossibile eliminare: nessun\'altra categoria disponibile come destinazione.');
          return;
        }
        setDeleting(cat.id);
        try {
          await window.electronAPI.categorie.delete(cat.id, others[0].id);
          await syncCategorie();
        } finally {
          setDeleting(null);
        }
      } else {
        setPendingDelete({ cat, count });
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  async function handleDeleteConfirmExisting(targetId: number) {
    if (!pendingDelete) return;
    try {
      await window.electronAPI.categorie.delete(pendingDelete.cat.id, targetId);
      await syncCategorie();
      setPendingDelete(null);
    } catch (e) {
      setErr(String(e));
      throw e;
    }
  }

  async function handleCreateNewForDelete(nome: string, colore: string | undefined, icona: string | undefined): Promise<number> {
    const created = await createCategoria(nome, colore, icona);
    return created.id;
  }

  async function handleDeleteWithTarget(id: number, targetId: number) {
    try {
      await window.electronAPI.categorie.delete(id, targetId);
      await syncCategorie();
      setPendingDelete(null);
    } catch (e) {
      setErr(String(e));
      throw e;
    }
  }

  return (
    <>
      {editTarget && (
        <EditCategoriaDialog
          cat={editTarget}
          onSave={updateCategoria}
          onClose={() => setEditTarget(null)}
        />
      )}
      {pendingDelete && (
        <DeleteCategoriaModal
          cat={pendingDelete.cat}
          altreCategorie={categorie.filter((c) => c.id !== pendingDelete.cat.id)}
          onConfirm={handleDeleteConfirmExisting}
          onConfirmNew={handleCreateNewForDelete}
          onDeleteWithTarget={handleDeleteWithTarget}
          onClose={() => setPendingDelete(null)}
        />
      )}
      <section aria-labelledby="categorie-heading">
        <SectionHeading id="categorie-heading">Categorie</SectionHeading>
        <SectionDesc>Aggiungi categorie personalizzate o modificane il nome, colore e icona. Le categorie predefinite non sono eliminabili.</SectionDesc>
        <ul role="list" className="mb-3 divide-y divide-border rounded-md border border-border">
          {categorie.map((cat) => (
            <li key={cat.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              {cat.colore && (
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: cat.colore }}
                />
              )}
              {cat.icona && (
                <span aria-hidden className="shrink-0 text-base leading-none">{cat.icona}</span>
              )}
              <span className={cn('flex-1 truncate', Boolean(cat.predefinita) && 'text-muted-foreground')}>
                {cat.nome}
                {Boolean(cat.predefinita) && (
                  <span className="ml-2 text-xs text-muted-foreground/60">(predefinita)</span>
                )}
              </span>
              <button
                onClick={() => setEditTarget(cat)}
                aria-label={`Modifica ${cat.nome}`}
                className={BTN_GHOST_EDIT}
              >
                <Pencil size={14} aria-hidden />
              </button>
              {!cat.predefinita && (
                <button
                  onClick={() => { void handleDeleteClick(cat); }}
                  disabled={deleting === cat.id}
                  aria-label={`Elimina ${cat.nome}`}
                  className={BTN_GHOST}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              )}
            </li>
          ))}
          {categorie.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">Nessuna categoria.</li>
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
            placeholder="Aggiungi categoria…"
            aria-label="Nome nuova categoria"
            className={cn(INPUT_CLS, 'flex-1')}
          />
          <button
            type="submit"
            disabled={adding || !input.trim()}
            className={BTN_PRIMARY}
            aria-label="Aggiungi categoria"
          >
            <Plus size={14} aria-hidden />
          </button>
        </form>
        {err && <p role="alert" className="mt-1 text-xs text-destructive">{err}</p>}
      </section>
    </>
  );
}

// ─── dettagli list ────────────────────────────────────────────────────────────

interface DettagliListProps {
  items: Dettaglio[];
  categorie: Categoria[];
  onAdd: (nome: string, categoria_id?: number) => Promise<void>;
  onDelete: (id: number, targetDettaglioId: number) => Promise<void>;
  onUpdateCategoria: (id: number, categoria_id: number | null) => Promise<void>;
  onEdit: (id: number, nome: string, categoria_id?: number) => Promise<void>;
}

function DettagliList({ items, categorie, onAdd, onDelete, onUpdateCategoria, onEdit }: DettagliListProps) {
  const [input, setInput] = useState('');
  const [addCatId, setAddCatId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Dettaglio | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; nome: string; count: number } | null>(null);
  const [pendingTargetId, setPendingTargetId] = useState<string>('');
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
    const others = items.filter((d) => d.id !== id);
    if (others.length === 0) {
      setErr('Impossibile eliminare: nessun altro dettaglio disponibile come destinazione.');
      return;
    }
    try {
      const count = await window.electronAPI.dettagli.countMovimenti(id);
      if (count > 0) {
        setPendingTargetId(String(others[0].id));
        setPendingDelete({ id, nome, count });
      } else {
        await doDelete(id, others[0].id);
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  async function doDelete(id: number, targetDettaglioId: number) {
    setDeleting(id);
    setPendingDelete(null);
    try {
      await onDelete(id, targetDettaglioId);
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
        Aggiungi dettagli personalizzati e associali a una categoria.
      </SectionDesc>

      {editTarget && (
        <EditDettaglioDialog
          det={editTarget}
          categorie={categorie}
          onSave={onEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

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
            {pendingDelete.count} moviment{pendingDelete.count === 1 ? 'o' : 'i'} usa{pendingDelete.count === 1 ? '' : 'no'} questo dettaglio. Scegli il dettaglio a cui riassegnarli.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <select
              value={pendingTargetId}
              onChange={(e) => setPendingTargetId(e.target.value)}
              aria-label="Dettaglio destinazione"
              className={SELECT_CLS}
            >
              {items
                .filter((d) => d.id !== pendingDelete.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
            </select>
            <button
              onClick={() => { void doDelete(pendingDelete.id, Number(pendingTargetId)); }}
              disabled={deleting !== null || !pendingTargetId}
              className={`${BTN_BASE} border-destructive bg-destructive text-destructive-foreground hover:opacity-90 text-xs`}
            >
              Elimina
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
            <button
              onClick={() => setEditTarget(item)}
              disabled={pendingDelete !== null}
              aria-label={`Modifica ${item.nome}`}
              className={BTN_GHOST_EDIT}
            >
              <Pencil size={14} aria-hidden />
            </button>
            <button
              onClick={() => { void handleDeleteRequest(item.id, item.nome); }}
              disabled={deleting === item.id || pendingDelete !== null}
              aria-label={`Elimina ${item.nome}`}
              className={BTN_GHOST}
            >
              <Trash2 size={14} aria-hidden />
            </button>
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
    metodi, dettagli, categorie,
    syncMetodi, createMetodo, deleteMetodo,
    syncDettagli, createDettaglio, deleteDettaglio, updateDettaglioCategoria, updateDettaglio,
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
        await Promise.all([syncMetodi(), syncDettagli()]);
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
      <CategorieSection />

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
        onEdit={updateDettaglio}
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
