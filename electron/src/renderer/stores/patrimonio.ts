import { create } from 'zustand';
import type { Granularita } from '../../ipc/types';

interface PatrimonioState {
  anno: number;
  granularita: Granularita;
  setAnno: (anno: number) => void;
  setGranularita: (granularita: Granularita) => Promise<void>;
  loadGranularita: () => Promise<void>;
}

const currentYear = new Date().getFullYear();

export const usePatrimonioStore = create<PatrimonioState>()((set, get) => ({
  anno: currentYear,
  granularita: 'mese',

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
}));
