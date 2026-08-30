import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { useThemeStore, type Theme } from '@/stores/theme';
import { useLookupStore } from '@/stores/lookup';
import { cn } from '@/lib/utils';
import type { Categoria, Dettaglio } from '../../../ipc/types';

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
const BTN_GHOST =
  'p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed';
const BTN_GHOST_DANGER =
  'p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed';
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
          <button onClick={onClose} aria-label="Chiudi" className={BTN_GHOST}>
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
            <button
              type="submit"
              disabled={saving || !nome.trim()}
              className={BTN_PRIMARY}
            >
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DeleteCategoriaModal ────────────────────────────────────────────────────

type DeleteMode = 'existing' | 'new';

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
  const [mode, setMode] = useState<DeleteMode>(hasOthers ? 'existing' : 'new');
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
          <button onClick={onClose} aria-label="Chiudi" className={BTN_GHOST} disabled={busy}>
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

// ─── CategorieSection ─────────────────────────────────────────────────────────

interface PendingDelete {
  cat: Categoria;
  count: number;
}

function CategorieSection() {
  const { categorie, syncCategorie, updateCategoria, createCategoria } = useLookupStore();
  const [editTarget, setEditTarget] = useState<Categoria | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
        <SectionDesc>Modifica o elimina le categorie. L&apos;eliminazione richiede la riassegnazione dei movimenti associati.</SectionDesc>

        <ul role="list" className="divide-y divide-border rounded-md border border-border">
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
              <span className="flex-1 truncate text-foreground">{cat.nome}</span>
              <button
                onClick={() => setEditTarget(cat)}
                aria-label={`Modifica ${cat.nome}`}
                className={BTN_GHOST}
              >
                <Pencil size={14} aria-hidden />
              </button>
              <button
                onClick={() => { void handleDeleteClick(cat); }}
                disabled={deleting === cat.id}
                aria-label={`Elimina ${cat.nome}`}
                className={BTN_GHOST_DANGER}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
          {categorie.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">Nessuna categoria.</li>
          )}
        </ul>

        {err && <p role="alert" className="mt-2 text-xs text-destructive">{err}</p>}
      </section>
    </>
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
          <button onClick={onClose} aria-label="Chiudi" className={BTN_GHOST}>
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

// ─── DeleteDettaglioModal ─────────────────────────────────────────────────────

interface DeleteDettaglioModalProps {
  det: Dettaglio;
  altriDettagli: Dettaglio[];
  onClose: () => void;
  onDeleted: () => Promise<void>;
}

function DeleteDettaglioModal({ det, altriDettagli, onClose, onDeleted }: DeleteDettaglioModalProps) {
  const hasOthers = altriDettagli.length > 0;
  const [mode, setMode] = useState<'existing' | 'new' | null>(null);
  const [existingId, setExistingId] = useState<string>('');
  const [newNome, setNewNome] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canConfirm =
    !busy &&
    ((mode === 'existing' && Boolean(existingId)) ||
      (mode === 'new' && Boolean(newNome.trim())));

  async function handleConfirm() {
    if (!canConfirm) return;
    setBusy(true);
    setErr(null);
    try {
      let targetId: number;
      if (mode === 'existing') {
        targetId = Number(existingId);
      } else {
        const created = (await window.electronAPI.dettagli.create({ nome: newNome.trim() })) as Dettaglio;
        targetId = created.id;
      }
      await window.electronAPI.dettagli.delete(det.id, targetId);
      await onDeleted();
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
      aria-labelledby="del-det-title"
      aria-describedby="del-det-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id="del-det-title" className="text-sm font-semibold text-foreground">
            Elimina «{det.nome}»
          </h2>
          <button onClick={onClose} aria-label="Chiudi" className={BTN_GHOST} disabled={busy}>
            <X size={14} aria-hidden />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p id="del-det-desc" className="text-xs text-muted-foreground">
            Questo dettaglio ha movimenti associati. Scegli a quale dettaglio riassegnarli prima di eliminarlo.
          </p>

          <fieldset className="space-y-3">
            <legend className="sr-only">Opzione di riassegnazione</legend>

            {hasOthers && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="del-det-mode"
                  value="existing"
                  checked={mode === 'existing'}
                  onChange={() => {
                    setMode('existing');
                    if (!existingId) setExistingId(String(altriDettagli[0].id));
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm text-foreground">Scegli esistente</span>
                  {mode === 'existing' && (
                    <select
                      value={existingId}
                      onChange={(e) => setExistingId(e.target.value)}
                      aria-label="Dettaglio destinazione"
                      className={cn(
                        'mt-2 block w-full rounded-md border border-border bg-background px-2 py-1 text-sm',
                        'text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    >
                      {altriDettagli.map((d) => (
                        <option key={d.id} value={d.id}>{d.nome}</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            )}

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="del-det-mode"
                value="new"
                checked={mode === 'new'}
                onChange={() => setMode('new')}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="text-sm text-foreground">Crea nuovo</span>
                {mode === 'new' && (
                  <input
                    type="text"
                    value={newNome}
                    onChange={(e) => setNewNome(e.target.value)}
                    placeholder="Nome dettaglio"
                    autoFocus
                    className={cn(INPUT_CLS, 'mt-2 w-full flex-none')}
                  />
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

// ─── DettagliSection ──────────────────────────────────────────────────────────

interface PendingDeleteDettaglio {
  det: Dettaglio;
}

function DettagliSection() {
  const { dettagli, categorie, syncDettagli, updateDettaglio } = useLookupStore();
  const [editTarget, setEditTarget] = useState<Dettaglio | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteDettaglio | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleDeleteClick(det: Dettaglio) {
    setErr(null);
    try {
      const count = await window.electronAPI.dettagli.countMovimenti(det.id);
      if (count === 0) {
        setDeleting(det.id);
        try {
          // count=0: UPDATE è no-op, self-ref è valido per soddisfare il contratto API
          await window.electronAPI.dettagli.delete(det.id, det.id);
          await syncDettagli();
        } finally {
          setDeleting(null);
        }
      } else {
        setPendingDelete({ det });
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <>
      {editTarget && (
        <EditDettaglioDialog
          det={editTarget}
          categorie={categorie}
          onSave={updateDettaglio}
          onClose={() => setEditTarget(null)}
        />
      )}

      {pendingDelete && (
        <DeleteDettaglioModal
          det={pendingDelete.det}
          altriDettagli={dettagli.filter((d) => d.id !== pendingDelete.det.id)}
          onClose={() => setPendingDelete(null)}
          onDeleted={syncDettagli}
        />
      )}

      <section aria-labelledby="dettagli-heading">
        <SectionHeading id="dettagli-heading">Dettagli</SectionHeading>
        <SectionDesc>Modifica o elimina i dettagli. Se un dettaglio ha movimenti associati, la riassegnazione è obbligatoria prima dell&apos;eliminazione.</SectionDesc>

        <ul role="list" className="divide-y divide-border rounded-md border border-border">
          {dettagli.map((det) => {
            const catNome = categorie.find((c) => c.id === det.categoria_id)?.nome;
            return (
              <li key={det.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="truncate text-foreground">{det.nome}</span>
                  {catNome && (
                    <span className="ml-2 text-xs text-muted-foreground">{catNome}</span>
                  )}
                </div>
                <button
                  onClick={() => setEditTarget(det)}
                  aria-label={`Modifica ${det.nome}`}
                  className={BTN_GHOST}
                >
                  <Pencil size={14} aria-hidden />
                </button>
                <button
                  onClick={() => { void handleDeleteClick(det); }}
                  disabled={deleting === det.id}
                  aria-label={`Elimina ${det.nome}`}
                  className={BTN_GHOST_DANGER}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            );
          })}
          {dettagli.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">Nessun dettaglio.</li>
          )}
        </ul>

        {err && <p role="alert" className="mt-2 text-xs text-destructive">{err}</p>}
      </section>
    </>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function ImpostazioniScreen() {
  const { theme, setTheme } = useThemeStore();
  const { syncCategorie, syncDettagli } = useLookupStore();

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
    void syncCategorie();
    void syncDettagli();
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

          {/* Categorie */}
          <CategorieSection />

          {/* Dettagli */}
          <DettagliSection />

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
