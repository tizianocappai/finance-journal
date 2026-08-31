import { contextBridge, ipcRenderer } from 'electron';
import type { Granularita, Movimento, MovimentoFilters, MovimentoCreate, MovimentoUpdate, SalvaMovimentoDettaglioOpts, PatrimonioVoce, PatrimonioValore, PatrimonioGruppo, KpiPatrimonio } from './ipc/types';


try {
  contextBridge.exposeInMainWorld('electronAPI', {
    categorie: {
      list: () => ipcRenderer.invoke('categorie:list'),
      create: (data: { nome: string; colore?: string; icona?: string }) =>
        ipcRenderer.invoke('categorie:create', data),
      update: (id: number, nome: string, colore?: string, icona?: string) =>
        ipcRenderer.invoke('categorie:update', { id, nome, colore, icona }),
      countMovimenti: (id: number) =>
        ipcRenderer.invoke('categorie:count-movimenti', { id }) as Promise<number>,
      delete: (id: number, targetCategoriaId: number) =>
        ipcRenderer.invoke('categorie:delete', { id, targetCategoriaId }),
    },
    metodi_pagamento: {
      list: () => ipcRenderer.invoke('metodi_pagamento:list'),
      create: (data: { nome: string }) =>
        ipcRenderer.invoke('metodi_pagamento:create', data),
      delete: (id: number) => ipcRenderer.invoke('metodi_pagamento:delete', { id }),
    },
    dettagli: {
      list: () => ipcRenderer.invoke('dettagli:list'),
      listPerFrequenza: () => ipcRenderer.invoke('dettagli:list-per-frequenza'),
      create: (data: { nome: string; categoria_id?: number }) =>
        ipcRenderer.invoke('dettagli:create', data),
      update: (id: number, nome: string, categoria_id?: number) =>
        ipcRenderer.invoke('dettagli:update', { id, nome, categoria_id }),
      delete: (id: number, targetDettaglioId: number) =>
        ipcRenderer.invoke('dettagli:delete', { id, targetDettaglioId }),
      updateCategoria: (id: number, categoria_id: number | null) =>
        ipcRenderer.invoke('dettagli:update-categoria', { id, categoria_id }),
      countMovimenti: (id: number) =>
        ipcRenderer.invoke('dettagli:count-movimenti', { id }) as Promise<number>,
    },
    movimenti: {
      list: (filters: MovimentoFilters = {}) =>
        ipcRenderer.invoke('movimenti:list', filters),
      create: (data: MovimentoCreate) =>
        ipcRenderer.invoke('movimenti:create', data),
      update: (id: number, data: MovimentoUpdate) =>
        ipcRenderer.invoke('movimenti:update', { id, ...data }),
      createConDettaglio: (data: MovimentoCreate, opts: SalvaMovimentoDettaglioOpts) =>
        ipcRenderer.invoke('movimenti:createConDettaglio', { data, opts }),
      updateConDettaglio: (id: number, data: MovimentoUpdate, opts: SalvaMovimentoDettaglioOpts) =>
        ipcRenderer.invoke('movimenti:updateConDettaglio', { id, data, opts }),
      delete: (id: number) =>
        ipcRenderer.invoke('movimenti:delete', { id }),
      restore: (movimento: Movimento) =>
        ipcRenderer.invoke('movimenti:restore', movimento),
      deleteAll: (filters: MovimentoFilters = {}) =>
        ipcRenderer.invoke('movimenti:deleteAll', filters),
    },
    dashboard: {
      kpi: (anno: number) => ipcRenderer.invoke('dashboard:kpi', { anno }),
      serieMensili: (anno: number) => ipcRenderer.invoke('dashboard:serie-mensili', { anno }),
      breakdownCategorie: (anno: number) =>
        ipcRenderer.invoke('dashboard:breakdown-categorie', { anno }),
      trendYoY: (anno: number) => ipcRenderer.invoke('dashboard:trend-yoy', { anno }),
      riepilogoMensile: (anno: number) =>
        ipcRenderer.invoke('dashboard:riepilogo-mensile', { anno }),
      pivotCategorie: (anno: number, tipo: 'uscita' | 'entrata') =>
        ipcRenderer.invoke('dashboard:pivot-categorie', { anno, tipo }),
      trendMensile: (anno: number) =>
        ipcRenderer.invoke('dashboard:trend-mensile', { anno }),
    },
    fileOps: {
      exportCsv: () => ipcRenderer.invoke('export:csv') as Promise<{ path: string } | null>,
      exportJson: () => ipcRenderer.invoke('export:json') as Promise<{ path: string } | null>,
      importDb: () => ipcRenderer.invoke('import:db') as Promise<undefined | null>,
      importCsvPreview: () => ipcRenderer.invoke('import:previewCsv') as Promise<import('./ipc/import_csv').PreviewResult | null>,
      importCsvExecute: (filePath: string) => ipcRenderer.invoke('import:executeCsv', { filePath }) as Promise<import('./ipc/import_csv').ExecuteResult>,
    },
    impostazioni: {
      dbPath: () => ipcRenderer.invoke('db:path') as Promise<string>,
      get: (chiave: string) =>
        ipcRenderer.invoke('impostazioni:get', { chiave }) as Promise<string | null>,
      set: (chiave: string, valore: string) =>
        ipcRenderer.invoke('impostazioni:set', { chiave, valore }) as Promise<void>,
    },
    patrimonio: {
      getGranularita: () =>
        ipcRenderer.invoke('patrimonio:get-granularita') as Promise<Granularita>,
      setGranularita: (valore: Granularita) =>
        ipcRenderer.invoke('patrimonio:set-granularita', { valore }) as Promise<void>,
      listGruppi: () =>
        ipcRenderer.invoke('patrimonio:list-gruppi') as Promise<PatrimonioGruppo[]>,
      createGruppo: (nome: string, tipo: 'attivo' | 'passivo', ordine?: number) =>
        ipcRenderer.invoke('patrimonio:create-gruppo', { nome, tipo, ordine }) as Promise<PatrimonioGruppo>,
      updateGruppo: (id: number, nome: string, ordine?: number) =>
        ipcRenderer.invoke('patrimonio:update-gruppo', { id, nome, ordine }) as Promise<PatrimonioGruppo>,
      deleteGruppo: (id: number) =>
        ipcRenderer.invoke('patrimonio:delete-gruppo', { id }) as Promise<void>,
      listVoci: (soloAttive: boolean, anno?: number) =>
        ipcRenderer.invoke('patrimonio:list-voci', { soloAttive, anno }) as Promise<PatrimonioVoce[]>,
      createVoce: (nome: string, tipo: 'attivo' | 'passivo', gruppoNome?: string, ordine?: number) =>
        ipcRenderer.invoke('patrimonio:create-voce', { nome, tipo, gruppoNome, ordine }) as Promise<PatrimonioVoce>,
      updateVoce: (id: number, updates: { nome?: string; gruppoNome?: string | null; ordine?: number }) =>
        ipcRenderer.invoke('patrimonio:update-voce', { id, ...updates }) as Promise<PatrimonioVoce>,
      archiveVoce: (id: number, anno: number) =>
        ipcRenderer.invoke('patrimonio:archive-voce', { id, anno }) as Promise<void>,
      restoreVoce: (id: number) =>
        ipcRenderer.invoke('patrimonio:restore-voce', { id }) as Promise<void>,
      listValori: (anno: number) =>
        ipcRenderer.invoke('patrimonio:list-valori', { anno }) as Promise<PatrimonioValore[]>,
      upsertValore: (voceId: number, anno: number, mese: number, importo: number) =>
        ipcRenderer.invoke('patrimonio:upsert-valore', { voceId, anno, mese, importo }) as Promise<PatrimonioValore>,
      deleteValore: (voceId: number, anno: number, mese: number) =>
        ipcRenderer.invoke('patrimonio:delete-valore', { voceId, anno, mese }) as Promise<void>,
      getKpi: (anno: number) =>
        ipcRenderer.invoke('patrimonio:get-kpi', { anno }) as Promise<KpiPatrimonio>,
      countValoriNascosti: (anno: number, nuovaGranularita: Granularita) =>
        ipcRenderer.invoke('patrimonio:count-valori-nascosti', { anno, nuovaGranularita }) as Promise<number>,
    },
  });
} catch (err) {
  console.error('Failed to expose contextBridge API:', err);
}
