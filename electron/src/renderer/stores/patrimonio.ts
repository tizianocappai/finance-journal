import { create } from 'zustand';
import type { Granularita, PatrimonioGruppo, PatrimonioValore, PatrimonioVoce } from '../../ipc/types';

interface PatrimonioState {
  anno: number;
  granularita: Granularita;
  voci: PatrimonioVoce[];
  gruppi: PatrimonioGruppo[];
  valori: PatrimonioValore[];
  mostraArchiviate: boolean;
  setAnno: (anno: number) => void;
  setGranularita: (granularita: Granularita) => Promise<void>;
  loadGranularita: () => Promise<void>;
  fetchVoci: (anno: number) => Promise<void>;
  addVoce: (nome: string, tipo: 'attivo' | 'passivo', gruppo?: string) => Promise<void>;
  editVoce: (id: number, nome: string, gruppo: string) => Promise<void>;
  archiveVoce: (id: number) => Promise<void>;
  restoreVoce: (id: number) => Promise<void>;
  reorderVoce: (id: number, direction: 'up' | 'down') => Promise<void>;
  toggleMostraArchiviate: () => void;
}

const currentYear = new Date().getFullYear();

export const usePatrimonioStore = create<PatrimonioState>()((set, get) => ({
  anno: currentYear,
  granularita: 'mese',
  voci: [],
  gruppi: [],
  valori: [],
  mostraArchiviate: false,

  setAnno: (anno) => set({ anno }),

  setGranularita: async (granularita) => {
    const previous = get().granularita;
    set({ granularita });
    try {
      await window.electronAPI.patrimonio.setGranularita(granularita);
    } catch (err) {
      set({ granularita: previous });
      console.error('Failed to persist granularita:', err);
    }
  },

  loadGranularita: async () => {
    try {
      const granularita = await window.electronAPI.patrimonio.getGranularita();
      set({ granularita });
    } catch (err) {
      console.error('Failed to load granularita:', err);
    }
  },

  fetchVoci: async (anno) => {
    try {
      const [voci, gruppi, valori] = await Promise.all([
        window.electronAPI.patrimonio.listVoci(false),
        window.electronAPI.patrimonio.listGruppi(),
        window.electronAPI.patrimonio.listValori(anno),
      ]);
      set({ voci, gruppi, valori });
    } catch (err) {
      console.error('Failed to fetch voci:', err);
    }
  },

  addVoce: async (nome, tipo, gruppo) => {
    const { voci, anno } = get();
    const ordine = voci.filter((v) => v.tipo === tipo && v.attiva === 1).length;
    try {
      const nuova = await window.electronAPI.patrimonio.createVoce(nome, tipo, gruppo, ordine);
      const gruppi = await window.electronAPI.patrimonio.listGruppi();
      set({ voci: [...voci, nuova], gruppi });
    } catch (err) {
      console.error('Failed to add voce:', err);
      throw err;
    }
  },

  editVoce: async (id, nome, gruppo) => {
    const { voci } = get();
    try {
      const aggiornata = await window.electronAPI.patrimonio.updateVoce(id, {
        nome,
        gruppoNome: gruppo || null,
      });
      const gruppi = await window.electronAPI.patrimonio.listGruppi();
      set({ voci: voci.map((v) => (v.id === id ? aggiornata : v)), gruppi });
    } catch (err) {
      console.error('Failed to edit voce:', err);
      throw err;
    }
  },

  archiveVoce: async (id) => {
    try {
      await window.electronAPI.patrimonio.archiveVoce(id);
      set({ voci: get().voci.map((v) => (v.id === id ? { ...v, attiva: 0 } : v)) });
    } catch (err) {
      console.error('Failed to archive voce:', err);
      throw err;
    }
  },

  restoreVoce: async (id) => {
    try {
      await window.electronAPI.patrimonio.restoreVoce(id);
      set({ voci: get().voci.map((v) => (v.id === id ? { ...v, attiva: 1 } : v)) });
    } catch (err) {
      console.error('Failed to restore voce:', err);
      throw err;
    }
  },

  reorderVoce: async (id, direction) => {
    const { voci } = get();
    const voce = voci.find((v) => v.id === id);
    if (!voce) return;

    const siblings = voci
      .filter((v) => v.tipo === voce.tipo && v.attiva === 1)
      .sort((a, b) => a.ordine - b.ordine || a.id - b.id);

    const idx = siblings.findIndex((v) => v.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    const other = siblings[swapIdx];
    const newOrdineForId = swapIdx;
    const newOrdineForOther = idx;

    set({
      voci: voci.map((v) => {
        if (v.id === id) return { ...v, ordine: newOrdineForId };
        if (v.id === other.id) return { ...v, ordine: newOrdineForOther };
        return v;
      }),
    });

    try {
      await window.electronAPI.patrimonio.updateVoce(id, { ordine: newOrdineForId });
      await window.electronAPI.patrimonio.updateVoce(other.id, { ordine: newOrdineForOther });
    } catch (err) {
      set({ voci });
      console.error('Failed to reorder voce:', err);
    }
  },

  toggleMostraArchiviate: () => set({ mostraArchiviate: !get().mostraArchiviate }),
}));
