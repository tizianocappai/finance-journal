import { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatrimonioStore } from '@/stores/patrimonio';
import type { PatrimonioVoce, PatrimonioValore } from '../../../ipc/types';

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

function getCellValue(valori: PatrimonioValore[], voceId: number, mese: number): string {
  const v = valori.find((x) => x.voce_id === voceId && x.mese === mese);
  return v != null ? formatImporto(v.importo) : '—';
}

function getQuarterValue(valori: PatrimonioValore[], voceId: number, quarter: number): string {
  const lastMese = quarter * 3;
  return getCellValue(valori, voceId, lastMese);
}

interface VoceDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  defaultTipo: 'attivo' | 'passivo';
  voce?: PatrimonioVoce;
  gruppoNomeIniziale?: string;
  onClose: () => void;
  onSave: (nome: string, tipo: 'attivo' | 'passivo', gruppo: string) => Promise<void>;
}

function VoceDialog({ open, mode, defaultTipo, voce, gruppoNomeIniziale = '', onClose, onSave }: VoceDialogProps) {
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
              onChange={(e) => setTipo(e.target.value as 'attivo' | 'passivo')}
              disabled={mode === 'edit'}
              className={cn(FIELD_CLS, mode === 'edit' && 'opacity-60')}
            >
              <option value="attivo">Attivo</option>
              <option value="passivo">Passivo</option>
            </select>
          </div>

          <div>
            <label htmlFor="voce-gruppo" className={LABEL_CLS}>
              Gruppo (opzionale)
            </label>
            <input
              id="voce-gruppo"
              type="text"
              value={gruppo}
              onChange={(e) => setGruppo(e.target.value)}
              className={FIELD_CLS}
              placeholder="Es. Liquidità"
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

interface VoceTableProps {
  tipo: 'attivo' | 'passivo';
  voci: PatrimonioVoce[];
  valori: PatrimonioValore[];
  granularita: 'mese' | 'quarter';
  mostraArchiviate: boolean;
  onEdit: (voce: PatrimonioVoce) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onReorder: (id: number, direction: 'up' | 'down') => void;
}

function VoceTable({
  tipo,
  voci,
  valori,
  granularita,
  mostraArchiviate,
  onEdit,
  onArchive,
  onRestore,
  onReorder,
}: VoceTableProps) {
  const attive = voci
    .filter((v) => v.tipo === tipo && v.attiva === 1)
    .sort((a, b) => a.ordine - b.ordine || a.id - b.id);

  const archiviate = mostraArchiviate
    ? voci.filter((v) => v.tipo === tipo && v.attiva === 0).sort((a, b) => a.id - b.id)
    : [];

  const righe = [...attive, ...archiviate];
  const periodi = granularita === 'mese' ? MESI : QUARTERS;

  if (righe.length === 0) {
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
          {righe.map((voce) => {
            const archiviata = voce.attiva === 0;
            const idxInAttive = attive.findIndex((v) => v.id === voce.id);
            return (
              <tr
                key={voce.id}
                className={cn(
                  'border-b border-border last:border-0 transition-colors',
                  archiviata
                    ? 'opacity-50'
                    : 'cursor-pointer hover:bg-accent/30',
                )}
                onClick={archiviata ? undefined : () => onEdit(voce)}
              >
                <td
                  className="px-2 py-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
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
                <td className="px-3 py-1.5 font-medium text-foreground">{voce.nome}</td>
                {granularita === 'mese'
                  ? MESI.map((_, i) => (
                      <td key={i} className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                        {getCellValue(valori, voce.id, i + 1)}
                      </td>
                    ))
                  : QUARTERS.map((_, i) => (
                      <td key={i} className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                        {getQuarterValue(valori, voce.id, i + 1)}
                      </td>
                    ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
    mostraArchiviate,
    fetchVoci,
    addVoce,
    editVoce,
    archiveVoce,
    restoreVoce,
    reorderVoce,
    toggleMostraArchiviate,
  } = usePatrimonioStore();

  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    mode: 'create',
    defaultTipo: 'attivo',
  });

  useEffect(() => {
    fetchVoci(anno);
  }, [anno, fetchVoci]);

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

  return (
    <>
      <VoceDialog
        open={dialog.open}
        mode={dialog.mode}
        defaultTipo={dialog.defaultTipo}
        voce={dialog.voce}
        gruppoNomeIniziale={dialog.gruppoNome}
        onClose={closeDialog}
        onSave={handleSave}
      />

      <div className="space-y-6">
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
            valori={valori}
            granularita={granularita}
            mostraArchiviate={mostraArchiviate}
            onEdit={openEdit}
            onArchive={archiveVoce}
            onRestore={restoreVoce}
            onReorder={reorderVoce}
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
            valori={valori}
            granularita={granularita}
            mostraArchiviate={mostraArchiviate}
            onEdit={openEdit}
            onArchive={archiveVoce}
            onRestore={restoreVoce}
            onReorder={reorderVoce}
          />
        </section>
      </div>
    </>
  );
}
