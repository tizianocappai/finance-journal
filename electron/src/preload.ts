import { contextBridge, ipcRenderer } from 'electron';

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
  });
} catch (err) {
  console.error('Failed to expose contextBridge API:', err);
}
