import { useEffect, useRef, useState } from 'react';
import { X, Trash2, Loader2, ChevronDown } from 'lucide-react';
import { useMovimentiStore } from '@/stores/movimenti';
import { useLookupStore } from '@/stores/lookup';
import type { MovimentoWithLookup } from '@/types/movimento';
import type { DettaglioConFrequenza, SalvaMovimentoDettaglioOpts } from '../../ipc/types';
import { validate, type DettaglioFormState, type MovimentoFormState } from '../lib/movimentoValidate';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  movimento?: MovimentoWithLookup;
  onClose: () => void;
}

type FormState = MovimentoFormState;

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function initForm(movimento?: MovimentoWithLookup): FormState {
  if (!movimento) {
    return {
      data: todayIso(),
      tipo: 'uscita',
      importo: '',
      dettaglio: { mode: 'empty' },
      categoria_id: '',
      metodo_id: '',
      nota: '',
    };
  }
  const dettaglio: DettaglioFormState =
    movimento.dettaglio_id != null
      ? { mode: 'existing', id: movimento.dettaglio_id, categoria_id: movimento.dettaglio_categoria_id }
      : { mode: 'empty' };
  return {
    data: movimento.data,
    tipo: movimento.tipo,
    importo: String(movimento.importo),
    dettaglio,
    categoria_id: movimento.categoria_id != null ? String(movimento.categoria_id) : '',
    metodo_id: movimento.metodo_id != null ? String(movimento.metodo_id) : '',
    nota: movimento.descrizione ?? '',
  };
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

interface DettaglioComboboxProps {
  dettagli: DettaglioConFrequenza[];
  value: DettaglioFormState;
  onChange: (v: DettaglioFormState) => void;
  error?: string;
  initialText?: string;
  inputId?: string;
}

function textFromValue(value: DettaglioFormState, dettagli: DettaglioConFrequenza[]): string | null {
  if (value.mode === 'existing') {
    const det = dettagli.find((d) => d.id === value.id);
    return det ? det.nome : null; // null = list not loaded yet, don't clear
  }
  if (value.mode === 'new') return value.nome;
  return '';
}

function DettaglioCombobox({ dettagli, value, onChange, error, initialText, inputId = 'f-dettaglio' }: DettaglioComboboxProps) {
  const [inputText, setInputText] = useState(initialText ?? '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = textFromValue(value, dettagli);
    if (next !== null) setInputText(next);
    // null means dettagli not loaded yet — preserve current text (avoids race on dialog open)
  }, [value, dettagli]);

  const filtered = dettagli.filter((d) =>
    d.nome.toLowerCase().includes(inputText.toLowerCase()),
  );

  const exactMatch = dettagli.some(
    (d) => d.nome.toLowerCase() === inputText.trim().toLowerCase(),
  );

  function handleInputChange(text: string) {
    setInputText(text);
    setOpen(true);
  }

  function handleSelect(det: DettaglioConFrequenza) {
    onChange({ mode: 'existing', id: det.id, categoria_id: det.categoria_id });
    setInputText(det.nome);
    setOpen(false);
  }

  function handleCreate() {
    const nome = inputText.trim();
    if (!nome) return;
    onChange({ mode: 'new', nome });
    setOpen(false);
  }

  function handleBlur() {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false);
        const next = textFromValue(value, dettagli);
        setInputText(next ?? '');
      }
    }, 150);
  }

  const showCreate = inputText.trim() !== '' && !exactMatch;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); handleBlur(); }
            if (e.key === 'Enter' && showCreate && filtered.length === 0) { e.preventDefault(); handleCreate(); }
          }}
          placeholder="Cerca o crea dettaglio…"
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
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-52 overflow-y-auto"
        >
          {filtered.length === 0 && !showCreate && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Nessun dettaglio trovato</div>
          )}
          {filtered.map((det) => (
            <button
              key={det.id}
              type="button"
              role="option"
              aria-selected={value.mode === 'existing' && value.id === det.id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(det); }}
              className={
                'w-full px-3 py-2 text-sm text-left hover:bg-accent text-foreground' +
                (value.mode === 'existing' && value.id === det.id ? ' bg-accent/50' : '')
              }
            >
              {det.nome}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              role="option"
              onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent text-muted-foreground border-t border-border"
            >
              Crea &ldquo;{inputText.trim()}&rdquo;
            </button>
          )}
        </div>
      )}

      {error && <p className={ERROR_CLS}>{error}</p>}
    </div>
  );
}

export default function MovimentoDialog({ open, mode, movimento, onClose }: Props) {
  const { createConDettaglio, updateConDettaglio, delete: deleteMovimento } = useMovimentiStore();
  const { categorie, metodi, dettagliPerFrequenza, syncCategorie, syncMetodi, syncDettagliPerFrequenza, createCategoria, createMetodo } = useLookupStore();

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
      syncDettagliPerFrequenza();
      setTimeout(() => firstFocusRef.current?.focus(), 50);
    }
  }, [open, movimento, syncCategorie, syncMetodi, syncDettagliPerFrequenza]);

  function patch(k: keyof Omit<FormState, 'dettaglio'>, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => { const next = { ...e }; delete next[k]; return next; });
  }

  function setDettaglio(det: DettaglioFormState) {
    setForm((f) => {
      const next = { ...f, dettaglio: det };
      if (det.mode === 'existing' && det.categoria_id != null) {
        next.categoria_id = String(det.categoria_id);
      } else if (det.mode === 'new' || (det.mode === 'existing' && det.categoria_id == null)) {
        next.categoria_id = '';
      }
      return next;
    });
    setCategoriaOverride(false);
    if (errors.dettaglio) setErrors((e) => { const next = { ...e }; delete next.dettaglio; return next; });
    if (errors.categoria_id) setErrors((e) => { const next = { ...e }; delete next.categoria_id; return next; });
  }

  async function handleSave() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const basePayload = {
        data: form.data,
        importo: parseFloat(form.importo),
        tipo: form.tipo,
        descrizione: form.nota || null,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        metodo_id: form.metodo_id ? Number(form.metodo_id) : null,
        dettaglio_id: form.dettaglio.mode === 'existing' ? form.dettaglio.id : null,
      };

      const opts: SalvaMovimentoDettaglioOpts = {};
      if (form.dettaglio.mode === 'new') {
        opts.nuovoDettaglio = { nome: form.dettaglio.nome, categoria_id: Number(form.categoria_id) };
      } else if (form.dettaglio.mode === 'existing' && form.dettaglio.categoria_id == null) {
        opts.aggiornaCategoriaDettaglio = { id: form.dettaglio.id, categoria_id: Number(form.categoria_id) };
      }

      if (mode === 'create') {
        await createConDettaglio(basePayload, opts);
      } else {
        await updateConDettaglio(movimento!.id, basePayload, opts);
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

  const dettaglioHasCategoria =
    form.dettaglio.mode === 'existing' && form.dettaglio.categoria_id != null;
  const categoriaLocked = dettaglioHasCategoria && !categoriaOverride;
  const categoriaRequired =
    form.dettaglio.mode === 'new' ||
    (form.dettaglio.mode === 'existing' && form.dettaglio.categoria_id == null);

  const catNome = categoriaLocked
    ? (categorie.find((c) => c.id === (form.dettaglio as { categoria_id: number }).categoria_id)?.nome ?? '—')
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-xl mx-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="dialog-title" className="text-sm font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} aria-label="Chiudi" className={BTN_GHOST + ' p-1 border-0'}>
            <X size={16} />
          </button>
        </div>

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
              <select id="f-tipo" name="tipo" value={form.tipo} onChange={(e) => patch('tipo', e.target.value as 'entrata' | 'uscita')} className={FIELD_CLS}>
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

          {/* Dettaglio — combobox */}
          <div>
            <label htmlFor="f-dettaglio" className={LABEL_CLS}>
              Dettaglio <span className="text-red-500">*</span>
            </label>
            <DettaglioCombobox
              dettagli={dettagliPerFrequenza}
              value={form.dettaglio}
              onChange={setDettaglio}
              error={errors.dettaglio}
              initialText={movimento?.dettaglio_nome ?? undefined}
            />
          </div>

          {/* Categoria */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="f-categoria" className={LABEL_CLS + ' mb-0'}>
                Categoria{categoriaRequired && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {categoriaLocked && (
                <button
                  type="button"
                  onClick={() => setCategoriaOverride(true)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Modifica
                </button>
              )}
              {categoriaOverride && dettaglioHasCategoria && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoriaOverride(false);
                    patch('categoria_id', String((form.dettaglio as { categoria_id: number }).categoria_id));
                  }}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Ripristina
                </button>
              )}
            </div>

            {categoriaLocked ? (
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
                  <option value="">{categoriaRequired ? '— Seleziona categoria —' : '— Nessuna —'}</option>
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
            {errors.categoria_id && <p className={ERROR_CLS}>{errors.categoria_id}</p>}
          </div>

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
