import { useEffect, useRef, useState } from 'react';
import { X, Trash2, Loader2 } from 'lucide-react';
import { useMovimentiStore } from '@/stores/movimenti';
import { useLookupStore } from '@/stores/lookup';
import type { MovimentoWithLookup } from '@/types/movimento';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  movimento?: MovimentoWithLookup;
  onClose: () => void;
}

interface FormState {
  data: string;
  tipo: 'entrata' | 'uscita';
  importo: string;
  categoria_id: string;
  dettaglio_id: string;
  metodo_id: string;
  nota: string;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function initForm(movimento?: MovimentoWithLookup): FormState {
  if (!movimento) {
    return { data: todayIso(), tipo: 'uscita', importo: '', categoria_id: '', dettaglio_id: '', metodo_id: '', nota: '' };
  }
  return {
    data: movimento.data,
    tipo: movimento.tipo,
    importo: String(movimento.importo),
    categoria_id: movimento.categoria_id != null ? String(movimento.categoria_id) : '',
    dettaglio_id: movimento.dettaglio_id != null ? String(movimento.dettaglio_id) : '',
    metodo_id: movimento.metodo_id != null ? String(movimento.metodo_id) : '',
    nota: movimento.descrizione ?? '',
  };
}

function validate(form: FormState): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.data) errs.data = 'Data obbligatoria';
  const n = parseFloat(form.importo);
  if (!form.importo || isNaN(n) || n <= 0) errs.importo = 'Importo deve essere maggiore di zero';
  return errs;
}

const FIELD_CLS = 'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const LABEL_CLS = 'block text-xs font-medium text-muted-foreground mb-1';
const ERROR_CLS = 'mt-1 text-xs text-red-500';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring';
const BTN_GHOST = 'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const BTN_DANGER = 'inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring';
const INLINE_INPUT_CLS = 'flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

interface InlineCreatorProps {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onCancel: () => void;
  adding: boolean;
  placeholder: string;
  error?: string;
}

function InlineCreator({ value, onChange, onAdd, onCancel, adding, placeholder, error }: InlineCreatorProps) {
  return (
    <>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
          className={INLINE_INPUT_CLS}
          autoFocus
        />
        <button onClick={onAdd} disabled={adding || !value.trim()} className={BTN_PRIMARY + ' py-1 px-3 text-xs'}>
          {adding ? <Loader2 size={14} className="animate-spin" /> : 'Aggiungi'}
        </button>
        <button onClick={onCancel} aria-label="Annulla" className={BTN_GHOST + ' py-1 px-2'}>
          <X size={14} />
        </button>
      </div>
      {error && <p className={ERROR_CLS}>{error}</p>}
    </>
  );
}

export default function MovimentoDialog({ open, mode, movimento, onClose }: Props) {
  const { create, update, delete: deleteMovimento } = useMovimentiStore();
  const { categorie, metodi, dettagli, syncCategorie, syncMetodi, syncDettagli, createCategoria, createMetodo } = useLookupStore();

  const [form, setForm] = useState<FormState>(() => initForm(movimento));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [creatingCategoria, setCreatingCategoria] = useState(false);
  const [nuovaCategoriaInput, setNuovaCategoriaInput] = useState('');
  const [addingCategoria, setAddingCategoria] = useState(false);
  const [categoriaOverride, setCategoriaOverride] = useState(false);

  const [creatingMetodo, setCreatingMetodo] = useState(false);
  const [nuovoMetodoInput, setNuovoMetodoInput] = useState('');
  const [addingMetodo, setAddingMetodo] = useState(false);

  const firstFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initForm(movimento));
      setErrors({});
      setConfirmDelete(false);
      setCreatingCategoria(false);
      setNuovaCategoriaInput('');
      setCategoriaOverride(false);
      setCreatingMetodo(false);
      setNuovoMetodoInput('');
      syncCategorie();
      syncMetodi();
      syncDettagli();
      setTimeout(() => firstFocusRef.current?.focus(), 50);
    }
  }, [open, movimento, syncCategorie, syncMetodi, syncDettagli]);

  function patch(k: keyof FormState, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => { const next = { ...e }; delete next[k]; return next; });
  }

  async function handleSave() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        data: form.data,
        importo: parseFloat(form.importo),
        tipo: form.tipo,
        descrizione: form.nota || null,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        metodo_id: form.metodo_id ? Number(form.metodo_id) : null,
        dettaglio_id: form.dettaglio_id ? Number(form.dettaglio_id) : null,
      };
      if (mode === 'create') {
        await create(payload);
      } else {
        await update(movimento!.id, payload);
      }
      onClose();
    } catch (err) {
      setErrors({ _form: String(err) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!movimento) return;
    setDeleting(true);
    try {
      await deleteMovimento(movimento.id);
      onClose();
    } catch (err) {
      setErrors({ _form: String(err) });
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddCategoria() {
    const nome = nuovaCategoriaInput.trim();
    if (!nome) return;
    setAddingCategoria(true);
    try {
      await createCategoria(nome);
      // Read fresh store state — closure `categorie` is stale after async update
      const created = useLookupStore.getState().categorie.find((c) => c.nome === nome);
      if (created) patch('categoria_id', String(created.id));
      setCreatingCategoria(false);
      setNuovaCategoriaInput('');
    } catch (err) {
      setErrors((e) => ({ ...e, _nuovaCategoria: String(err) }));
    } finally {
      setAddingCategoria(false);
    }
  }

  async function handleAddMetodo() {
    const nome = nuovoMetodoInput.trim();
    if (!nome) return;
    setAddingMetodo(true);
    try {
      await createMetodo(nome);
      // Read fresh store state — closure `metodi` is stale after async update
      const created = useLookupStore.getState().metodi.find((m) => m.nome === nome);
      if (created) patch('metodo_id', String(created.id));
      setCreatingMetodo(false);
      setNuovoMetodoInput('');
    } catch (err) {
      setErrors((e) => ({ ...e, _nuovoMetodo: String(err) }));
    } finally {
      setAddingMetodo(false);
    }
  }

  if (!open) return null;

  const title = mode === 'create' ? 'Nuovo movimento' : 'Modifica movimento';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="dialog-title" className="text-sm font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} aria-label="Chiudi" className={BTN_GHOST + ' p-1 border-0'}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Data */}
          <div>
            <label htmlFor="f-data" className={LABEL_CLS}>Data</label>
            <input
              ref={firstFocusRef}
              id="f-data"
              name="data"
              type="date"
              value={form.data}
              onChange={(e) => patch('data', e.target.value)}
              className={FIELD_CLS}
            />
            {errors.data && <p className={ERROR_CLS}>{errors.data}</p>}
          </div>

          {/* Tipo + Importo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="f-tipo" className={LABEL_CLS}>Tipo</label>
              <select id="f-tipo" name="tipo" value={form.tipo} onChange={(e) => patch('tipo', e.target.value)} className={FIELD_CLS}>
                <option value="uscita">Uscita</option>
                <option value="entrata">Entrata</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-importo" className={LABEL_CLS}>Importo (€)</label>
              <input
                id="f-importo"
                name="importo"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.importo}
                onChange={(e) => patch('importo', e.target.value)}
                className={FIELD_CLS}
              />
              {errors.importo && <p className={ERROR_CLS}>{errors.importo}</p>}
            </div>
          </div>

          {/* Dettaglio */}
          <div>
            <label htmlFor="f-dettaglio" className={LABEL_CLS}>
              Dettaglio <span className="font-normal text-muted-foreground">(opzionale)</span>
            </label>
            <select
              id="f-dettaglio"
              name="dettaglio_id"
              value={form.dettaglio_id}
              onChange={(e) => {
                const val = e.target.value;
                const det = dettagli.find((d) => String(d.id) === val);
                const hasCategoria = det?.categoria_id != null;
                setForm((f) => ({
                  ...f,
                  dettaglio_id: val,
                  ...(hasCategoria ? { categoria_id: String(det!.categoria_id) } : {}),
                }));
                if (errors.dettaglio_id) setErrors((e) => { const next = { ...e }; delete next.dettaglio_id; return next; });
                if (hasCategoria) { setCreatingCategoria(false); setCategoriaOverride(false); }
              }}
              className={FIELD_CLS}
            >
              <option value="">— Nessuno —</option>
              {dettagli.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>

          {/* Categoria — derivata dal dettaglio, modificabile solo su override esplicito */}
          {(() => {
            const selectedDet = dettagli.find((d) => String(d.id) === form.dettaglio_id);
            const derivata = selectedDet?.categoria_id != null && !categoriaOverride;
            const catNome = derivata
              ? (categorie.find((c) => c.id === selectedDet!.categoria_id)?.nome ?? '—')
              : null;
            return (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="f-categoria" className={LABEL_CLS + ' mb-0'}>Categoria</label>
                  {derivata && (
                    <button
                      type="button"
                      onClick={() => setCategoriaOverride(true)}
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      Modifica
                    </button>
                  )}
                  {categoriaOverride && selectedDet?.categoria_id != null && (
                    <button
                      type="button"
                      onClick={() => { setCategoriaOverride(false); patch('categoria_id', String(selectedDet.categoria_id)); }}
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      Ripristina
                    </button>
                  )}
                </div>
                {derivata ? (
                  <div className={FIELD_CLS + ' text-muted-foreground cursor-default'}>{catNome}</div>
                ) : (
                  <>
                    <select
                      id="f-categoria"
                      name="categoria_id"
                      value={creatingCategoria ? '__new__' : (form.categoria_id || '')}
                      onChange={(e) => {
                        if (e.target.value === '__new__') { setCreatingCategoria(true); }
                        else { setCreatingCategoria(false); patch('categoria_id', e.target.value); }
                      }}
                      className={FIELD_CLS}
                    >
                      <option value="">— Nessuna —</option>
                      {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      <option value="__new__">+ Nuova categoria…</option>
                    </select>
                    {creatingCategoria && (
                      <InlineCreator
                        value={nuovaCategoriaInput}
                        onChange={setNuovaCategoriaInput}
                        onAdd={handleAddCategoria}
                        onCancel={() => { setCreatingCategoria(false); setNuovaCategoriaInput(''); }}
                        adding={addingCategoria}
                        placeholder="Nome categoria"
                        error={errors._nuovaCategoria}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* Metodo */}
          <div>
            <label htmlFor="f-metodo" className={LABEL_CLS}>Metodo di pagamento</label>
            <select
              id="f-metodo"
              name="metodo_id"
              value={creatingMetodo ? '__new__' : (form.metodo_id || '')}
              onChange={(e) => {
                if (e.target.value === '__new__') { setCreatingMetodo(true); }
                else { setCreatingMetodo(false); patch('metodo_id', e.target.value); }
              }}
              className={FIELD_CLS}
            >
              <option value="">— Nessuno —</option>
              {metodi.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              <option value="__new__">+ Nuovo metodo…</option>
            </select>
            {creatingMetodo && (
              <InlineCreator
                value={nuovoMetodoInput}
                onChange={setNuovoMetodoInput}
                onAdd={handleAddMetodo}
                onCancel={() => { setCreatingMetodo(false); setNuovoMetodoInput(''); }}
                adding={addingMetodo}
                placeholder="Nome metodo"
                error={errors._nuovoMetodo}
              />
            )}
          </div>

          {/* Nota */}
          <div>
            <label htmlFor="f-nota" className={LABEL_CLS}>
              Nota <span className="font-normal text-muted-foreground">(opzionale)</span>
            </label>
            <input
              id="f-nota"
              name="nota"
              type="text"
              placeholder="Descrizione…"
              value={form.nota}
              onChange={(e) => patch('nota', e.target.value)}
              className={FIELD_CLS}
            />
          </div>

          {errors._form && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{errors._form}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <div>
            {mode === 'edit' && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)} className={BTN_GHOST + ' text-destructive border-destructive/30 hover:bg-destructive/10'}>
                <Trash2 size={14} />
                Elimina
              </button>
            )}
            {mode === 'edit' && confirmDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Confermi?</span>
                <button onClick={handleDelete} disabled={deleting} className={BTN_DANGER}>
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : 'Sì, elimina'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className={BTN_GHOST}>Annulla</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className={BTN_GHOST}>Annulla</button>
            <button onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
