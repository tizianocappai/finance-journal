import { create } from 'zustand';
import type { Granularita, KpiPatrimonio, PatrimonioGruppo, PatrimonioValore, PatrimonioVoce } from '../../ipc/types';

interface PatrimonioState {
  anno: number;
  granularita: Granularita;
  voci: PatrimonioVoce[];
  gruppi: PatrimonioGruppo[];
  valori: PatrimonioValore[];
  kpi: KpiPatrimonio | null;
  mostraArchiviate: boolean;
  setAnno: (anno: number) => void;
  setGranularita: (granularita: Granularita) => Promise<void>;
  loadGranularita: () => Promise<void>;
  fetchVoci: (anno: number) => Promise<void>;
  upsertValore: (voceId: number, mese: number, importo: number) => Promise<void>;
  deleteValore: (voceId: number, mese: number) => Promise<void>;
  countValoriNascosti: (nuovaGranularita: Granularita) => Promise<number>;
  addVoce: (nome: string, tipo: 'attivo' | 'passivo', gruppo?: string) => Promise<void>;
  editVoce: (id: number, nome: string, gruppo: string) => Promise<void>;
  archiveVoce: (id: number) => Promise<void>;
  restoreVoce: (id: number) => Promise<void>;
  reorderVoce: (id: number, direction: 'up' | 'down') => Promise<void>;
  toggleMostraArchiviate: () => void;
  fetchGruppi: () => Promise<void>;
  createGruppo: (nome: string, tipo: 'attivo' | 'passivo') => Promise<PatrimonioGruppo>;
  updateGruppo: (id: number, nome: string) => Promise<void>;
  deleteGruppo: (id: number) => Promise<void>;
}

const currentYear = new Date().getFullYear();

async function refreshValoriAndKpi(
  anno: number,
  set: (partial: Partial<PatrimonioState>) => void,
): Promise<void> {
  const [valori, kpi] = await Promise.all([
    window.electronAPI.patrimonio.listValori(anno),
    window.electronAPI.patrimonio.getKpi(anno),
  ]);
  set({ valori, kpi });
}

export const usePatrimonioStore = create<PatrimonioState>()((set, get) => ({
  anno: currentYear,
  granularita: 'mese',
  voci: [],
  gruppi: [],
  valori: [],
  kpi: null,
  mostraArchiviate: false,

  setAnno: (anno) => set({ anno }),

  setGranularita: async (granularita) => {
    set({ granularita });
    try {
      await window.electronAPI.patrimonio.setGranularita(granularita);
    } catch (err) {
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
      const [voci, gruppi, valori, kpi] = await Promise.all([
        window.electronAPI.patrimonio.listVoci(false, anno),
        window.electronAPI.patrimonio.listGruppi(),
        window.electronAPI.patrimonio.listValori(anno),
        window.electronAPI.patrimonio.getKpi(anno),
      ]);
      set({ voci, gruppi, valori, kpi });
    } catch (err) {
      console.error('Failed to fetch voci:', err);
    }
  },

  upsertValore: async (voceId, mese, importo) => {
    const { anno } = get();
    try {
      await window.electronAPI.patrimonio.upsertValore(voceId, anno, mese, importo);
      await refreshValoriAndKpi(anno, set);
    } catch (err) {
      console.error('Failed to upsert valore:', err);
      throw err;
    }
  },

  deleteValore: async (voceId, mese) => {
    const { anno } = get();
    try {
      await window.electronAPI.patrimonio.deleteValore(voceId, anno, mese);
      await refreshValoriAndKpi(anno, set);
    } catch (err) {
      console.error('Failed to delete valore:', err);
      throw err;
    }
  },

  countValoriNascosti: async (nuovaGranularita) => {
    const { anno } = get();
    return window.electronAPI.patrimonio.countValoriNascosti(anno, nuovaGranularita);
  },

  addVoce: async (nome, tipo, gruppo) => {
    const { voci } = get();
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
    const { anno } = get();
    try {
      await window.electronAPI.patrimonio.archiveVoce(id, anno);
      set({ voci: get().voci.map((v) => (v.id === id ? { ...v, attiva: 0, anno_archiviato: anno } : v)) });
    } catch (err) {
      console.error('Failed to archive voce:', err);
      throw err;
    }
  },

  restoreVoce: async (id) => {
    try {
      await window.electronAPI.patrimonio.restoreVoce(id);
      set({ voci: get().voci.map((v) => (v.id === id ? { ...v, attiva: 1, anno_archiviato: null } : v)) });
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

  fetchGruppi: async () => {
    try {
      const gruppi = await window.electronAPI.patrimonio.listGruppi();
      set({ gruppi });
    } catch (err) {
      console.error('Failed to fetch gruppi:', err);
    }
  },

  createGruppo: async (nome, tipo) => {
    try {
      const nuovo = await window.electronAPI.patrimonio.createGruppo(nome, tipo);
      set({ gruppi: [...get().gruppi, nuovo] });
      return nuovo;
    } catch (err) {
      console.error('Failed to create gruppo:', err);
      throw err;
    }
  },

  updateGruppo: async (id, nome) => {
    try {
      const aggiornato = await window.electronAPI.patrimonio.updateGruppo(id, nome);
      set({ gruppi: get().gruppi.map((g) => (g.id === id ? aggiornato : g)) });
    } catch (err) {
      console.error('Failed to update gruppo:', err);
      throw err;
    }
  },

  deleteGruppo: async (id) => {
    try {
      await window.electronAPI.patrimonio.deleteGruppo(id);
      set({
        gruppi: get().gruppi.filter((g) => g.id !== id),
        voci: get().voci.map((v) => (v.gruppo_id === id ? { ...v, gruppo_id: null } : v)),
      });
    } catch (err) {
      console.error('Failed to delete gruppo:', err);
      throw err;
    }
  },
}));
