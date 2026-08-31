import { create } from 'zustand';
import type { Categoria, MetodoPagamento, Dettaglio, DettaglioConFrequenza } from '../../ipc/types';

interface LookupState {
  categorie: Categoria[];
  metodi: MetodoPagamento[];
  dettagli: Dettaglio[];
  dettagliPerFrequenza: DettaglioConFrequenza[];

  syncCategorie: () => Promise<void>;
  createCategoria: (nome: string, colore?: string, icona?: string) => Promise<Categoria>;
  updateCategoria: (id: number, nome: string, colore?: string, icona?: string) => Promise<void>;
  deleteCategoria: (id: number) => Promise<void>;

  syncMetodi: () => Promise<void>;
  createMetodo: (nome: string) => Promise<void>;
  deleteMetodo: (id: number) => Promise<void>;

  syncDettagli: () => Promise<void>;
  syncDettagliPerFrequenza: () => Promise<void>;
  createDettaglio: (nome: string, categoria_id?: number) => Promise<void>;
  updateDettaglio: (id: number, nome: string, categoria_id?: number) => Promise<void>;
  deleteDettaglio: (id: number, targetDettaglioId: number) => Promise<void>;
  updateDettaglioCategoria: (id: number, categoria_id: number | null) => Promise<void>;
}

export const useLookupStore = create<LookupState>()((set, get) => ({
  categorie: [],
  metodi: [],
  dettagli: [],
  dettagliPerFrequenza: [],

  syncCategorie: async () => {
    try {
      const data = await window.electronAPI.categorie.list();
      set({ categorie: data });
    } catch (err) {
      console.error('syncCategorie failed:', err);
    }
  },

  createCategoria: async (nome, colore, icona) => {
    try {
      const created = await window.electronAPI.categorie.create({ nome, colore, icona });
      const data = await window.electronAPI.categorie.list();
      set({ categorie: data });
      return created as Categoria;
    } catch (err) {
      console.error('createCategoria failed:', err);
      throw err;
    }
  },

  updateCategoria: async (id, nome, colore, icona) => {
    try {
      const updated = await window.electronAPI.categorie.update(id, nome, colore, icona);
      set((state) => ({
        categorie: state.categorie.map((c) => (c.id === id ? (updated as Categoria) : c)),
      }));
    } catch (err) {
      console.error('updateCategoria failed:', err);
      throw err;
    }
  },

  deleteCategoria: async (id) => {
    try {
      const other = get().categorie.find((c) => c.id !== id);
      if (!other) throw new Error('Nessuna categoria alternativa disponibile');
      await window.electronAPI.categorie.delete(id, other.id);
      const data = await window.electronAPI.categorie.list();
      set({ categorie: data });
    } catch (err) {
      console.error('deleteCategoria failed:', err);
      throw err;
    }
  },

  syncMetodi: async () => {
    try {
      const data = await window.electronAPI.metodi_pagamento.list();
      set({ metodi: data });
    } catch (err) {
      console.error('syncMetodi failed:', err);
    }
  },

  createMetodo: async (nome) => {
    try {
      await window.electronAPI.metodi_pagamento.create({ nome });
      const data = await window.electronAPI.metodi_pagamento.list();
      set({ metodi: data });
    } catch (err) {
      console.error('createMetodo failed:', err);
      throw err;
    }
  },

  deleteMetodo: async (id) => {
    try {
      await window.electronAPI.metodi_pagamento.delete(id);
      const data = await window.electronAPI.metodi_pagamento.list();
      set({ metodi: data });
    } catch (err) {
      console.error('deleteMetodo failed:', err);
      throw err;
    }
  },

  syncDettagli: async () => {
    try {
      const data = await window.electronAPI.dettagli.list();
      set({ dettagli: data });
    } catch (err) {
      console.error('syncDettagli failed:', err);
    }
  },

  syncDettagliPerFrequenza: async () => {
    try {
      const data = await window.electronAPI.dettagli.listPerFrequenza();
      set({ dettagliPerFrequenza: data });
    } catch (err) {
      console.error('syncDettagliPerFrequenza failed:', err);
    }
  },

  createDettaglio: async (nome, categoria_id) => {
    try {
      await window.electronAPI.dettagli.create({ nome, categoria_id });
      const data = await window.electronAPI.dettagli.list();
      set({ dettagli: data });
    } catch (err) {
      console.error('createDettaglio failed:', err);
      throw err;
    }
  },

  updateDettaglio: async (id, nome, categoria_id) => {
    try {
      const updated = await window.electronAPI.dettagli.update(id, nome, categoria_id);
      set((state) => ({
        dettagli: state.dettagli.map((d) => (d.id === id ? updated : d)),
      }));
    } catch (err) {
      console.error('updateDettaglio failed:', err);
      throw err;
    }
  },

  deleteDettaglio: async (id, targetDettaglioId) => {
    try {
      await window.electronAPI.dettagli.delete(id, targetDettaglioId);
      const data = await window.electronAPI.dettagli.list();
      set({ dettagli: data });
    } catch (err) {
      console.error('deleteDettaglio failed:', err);
      throw err;
    }
  },

  updateDettaglioCategoria: async (id, categoria_id) => {
    try {
      const updated = await window.electronAPI.dettagli.updateCategoria(id, categoria_id);
      set((state) => ({
        dettagli: state.dettagli.map((d) => (d.id === id ? updated : d)),
      }));
    } catch (err) {
      console.error('updateDettaglioCategoria failed:', err);
      throw err;
    }
  },
}));
