import { contextBridge, ipcRenderer } from 'electron';
import type { MovimentoFilters, MovimentoCreate, MovimentoUpdate } from './ipc/types';


try {
  contextBridge.exposeInMainWorld('electronAPI', {
    categorie: {
      list: () => ipcRenderer.invoke('categorie:list'),
      create: (data: { nome: string; colore?: string; icona?: string }) =>
        ipcRenderer.invoke('categorie:create', data),
      delete: (id: number) => ipcRenderer.invoke('categorie:delete', { id }),
    },
    metodi_pagamento: {
      list: () => ipcRenderer.invoke('metodi_pagamento:list'),
      create: (data: { nome: string }) =>
        ipcRenderer.invoke('metodi_pagamento:create', data),
      delete: (id: number) => ipcRenderer.invoke('metodi_pagamento:delete', { id }),
    },
    dettagli: {
      list: () => ipcRenderer.invoke('dettagli:list'),
      create: (data: { nome: string; categoria_id?: number }) =>
        ipcRenderer.invoke('dettagli:create', data),
      delete: (id: number) => ipcRenderer.invoke('dettagli:delete', { id }),
      updateCategoria: (id: number, categoria_id: number | null) =>
        ipcRenderer.invoke('dettagli:update-categoria', { id, categoria_id }),
    },
    movimenti: {
      list: (filters: MovimentoFilters = {}) =>
        ipcRenderer.invoke('movimenti:list', filters),
      create: (data: MovimentoCreate) =>
        ipcRenderer.invoke('movimenti:create', data),
      update: (id: number, data: MovimentoUpdate) =>
        ipcRenderer.invoke('movimenti:update', { id, ...data }),
      delete: (id: number) =>
        ipcRenderer.invoke('movimenti:delete', { id }),
    },
    dashboard: {
      kpi: (anno: number) => ipcRenderer.invoke('dashboard:kpi', { anno }),
      serieMensili: (anno: number) => ipcRenderer.invoke('dashboard:serie-mensili', { anno }),
      breakdownCategorie: (anno: number) =>
        ipcRenderer.invoke('dashboard:breakdown-categorie', { anno }),
      trendYoY: (anno: number) => ipcRenderer.invoke('dashboard:trend-yoy', { anno }),
    },
    fileOps: {
      exportCsv: () => ipcRenderer.invoke('export:csv') as Promise<{ path: string } | null>,
      exportJson: () => ipcRenderer.invoke('export:json') as Promise<{ path: string } | null>,
      importDb: () => ipcRenderer.invoke('import:db') as Promise<undefined | null>,
    },
  });
} catch (err) {
  console.error('Failed to expose contextBridge API:', err);
}
