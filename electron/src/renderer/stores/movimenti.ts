import { create } from 'zustand';
import type {
  MovimentoWithLookup,
  MovimentoFilters,
  MovimentoCreate,
  MovimentoUpdate,
} from '../../ipc/types';

interface MovimentiState {
  movimenti: MovimentoWithLookup[];
  filters: MovimentoFilters;
  loading: boolean;
  error: string | null;
  lastDeleted: MovimentoWithLookup | null;

  fetch: () => Promise<void>;
  create: (data: MovimentoCreate) => Promise<void>;
  update: (id: number, data: MovimentoUpdate) => Promise<void>;
  delete: (id: number) => Promise<void>;
  restore: () => Promise<void>;
  setLastDeleted: (m: MovimentoWithLookup) => void;
  clearLastDeleted: () => void;
  setFilter: (patch: Partial<MovimentoFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: MovimentoFilters = {};

export const useMovimentiStore = create<MovimentiState>()((set, get) => {
  async function mutate(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      await get().fetch();
    } catch (err) {
      set({ error: String(err) });
      throw err;
    }
  }

  return {
    movimenti: [],
    filters: DEFAULT_FILTERS,
    loading: false,
    error: null,
    lastDeleted: null,

    fetch: async () => {
      set({ loading: true, error: null });
      try {
        const data = await window.electronAPI.movimenti.list(get().filters);
        set({ movimenti: data, loading: false });
      } catch (err) {
        set({ loading: false, error: String(err) });
      }
    },

    create: (data) => mutate(() => window.electronAPI.movimenti.create(data).then(() => undefined)),

    update: (id, data) => mutate(() => window.electronAPI.movimenti.update(id, data).then(() => undefined)),

    delete: async (id) => {
      try {
        const toDelete = get().movimenti.find((m) => m.id === id) ?? null;
        await window.electronAPI.movimenti.delete(id);
        if (toDelete) set({ lastDeleted: toDelete });
        await get().fetch();
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    restore: async () => {
      const { lastDeleted } = get();
      if (!lastDeleted) return;
      try {
        await window.electronAPI.movimenti.restore(lastDeleted);
        set({ lastDeleted: null });
        await get().fetch();
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    setLastDeleted: (m) => set({ lastDeleted: m }),
    clearLastDeleted: () => set({ lastDeleted: null }),

    setFilter: (patch) => {
      set((state) => ({ filters: { ...state.filters, ...patch } }));
      get().fetch();
    },

    resetFilters: () => {
      set({ filters: DEFAULT_FILTERS });
      get().fetch();
    },
  };
});
