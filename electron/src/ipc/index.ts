import type { IpcMain } from 'electron';
import { dialog, app } from 'electron';
import type Database from 'better-sqlite3';
import { listCategorie, createCategoria, deleteCategoria, updateCategoria, countMovimentiByCategoria } from './categorie';
import { listMetodi, createMetodo, deleteMetodo } from './metodi_pagamento';
import {
  listDettagli,
  createDettaglio,
  deleteDettaglio,
  updateDettaglio,
  updateDettaglioCategoria,
  countMovimentiByDettaglio,
  getDettagliOrdinatiPerFrequenza,
} from './dettagli';
import {
  listMovimenti,
  createMovimento,
  updateMovimento,
  deleteMovimento,
  restoreMovimento,
  deleteAllMovimenti,
  createMovimentoConDettaglio,
  updateMovimentoConDettaglio,
} from './movimenti';
import {
  getDashboardKPI,
  getSerieMensili,
  getBreakdownCategorie,
  getTrendYoY,
  getRiepilogoMensile,
  getPivotCategorie,
  getTrendMensile,
} from './dashboard';
import { exportCsv, exportJson, importDb } from './export_import';
import { previewCsv, executeCsv } from './import_csv';
import { getImpostazione, setImpostazione } from './impostazioni';
import {
  getGranularita,
  setGranularita,
  listVoci,
  createVoce,
  updateVoce,
  archiveVoce,
  restoreVoce,
  listValoriPerAnno,
  upsertValore,
  deleteValore,
  getKpiPatrimonio,
  getStorico,
  countValoriNascosti,
  listGruppi,
  createGruppo,
  updateGruppo,
  deleteGruppo,
  findOrCreateGruppo,
} from './patrimonio';
import type { Granularita, Movimento, MovimentoFilters, MovimentoCreate, MovimentoUpdate, SalvaMovimentoDettaglioOpts } from './types';

export function registerImpostazioniHandlers(
  ipcMain: IpcMain,
  db: Database.Database,
  dbPath: string,
): void {
  ipcMain.handle('db:path', () => dbPath);
  ipcMain.handle('impostazioni:get', (_e, { chiave }: { chiave: string }) =>
    getImpostazione(db, chiave),
  );
  ipcMain.handle('impostazioni:set', (_e, { chiave, valore }: { chiave: string; valore: string }) =>
    setImpostazione(db, chiave, valore),
  );
}

export function registerExportImportHandlers(
  ipcMain: IpcMain,
  db: Database.Database,
  dbPath: string,
): void {
  const backupDir = app.getPath('userData');

  async function saveAndExport(
    fn: (db: Database.Database, filePath: string) => void,
    defaultPath: string,
    filterName: string,
    ext: string,
  ): Promise<{ path: string } | null> {
    const result = await dialog.showSaveDialog({
      defaultPath,
      filters: [{ name: filterName, extensions: [ext] }],
    });
    if (result.canceled || !result.filePath) return null;
    fn(db, result.filePath);
    return { path: result.filePath };
  }

  ipcMain.handle('export:csv', () =>
    saveAndExport(exportCsv, 'movimenti.csv', 'CSV', 'csv'),
  );

  ipcMain.handle('export:json', () =>
    saveAndExport(exportJson, 'nobudget-backup.json', 'JSON', 'json'),
  );

  ipcMain.handle('import:db', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Database SQLite', extensions: ['db'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    // importDb validates first (db stays open on failure), then closes db, backs up and replaces
    importDb(db, dbPath, result.filePaths[0], backupDir);

    setTimeout(() => { app.relaunch(); app.exit(); }, 2000);
    return undefined;
  });

  ipcMain.handle('import:previewCsv', async () => {
    try {
      const result = await dialog.showOpenDialog({
        filters: [{ name: 'CSV', extensions: ['csv', 'tsv', 'txt'] }],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return previewCsv(db, result.filePaths[0]);
    } catch (err) {
      throw new Error(`Errore analisi CSV: ${String(err)}`);
    }
  });

  ipcMain.handle('import:executeCsv', (_e, { filePath }: { filePath: string }) => {
    try {
      return executeCsv(db, filePath);
    } catch (err) {
      throw new Error(`Errore import CSV: ${String(err)}`);
    }
  });
}

export function registerLookupHandlers(
  ipcMain: IpcMain,
  db: Database.Database,
): void {
  ipcMain.handle('categorie:list', () => listCategorie(db));
  ipcMain.handle('categorie:create', (_e, { nome, colore, icona }: { nome: string; colore?: string; icona?: string }) =>
    createCategoria(db, nome, colore, icona),
  );
  ipcMain.handle('categorie:update', (_e, { id, nome, colore, icona }: { id: number; nome: string; colore?: string; icona?: string }) =>
    updateCategoria(db, id, nome, colore, icona),
  );
  ipcMain.handle('categorie:count-movimenti', (_e, { id }: { id: number }) =>
    countMovimentiByCategoria(db, id),
  );
  ipcMain.handle('categorie:delete', (_e, { id, targetCategoriaId }: { id: number; targetCategoriaId: number }) =>
    deleteCategoria(db, id, targetCategoriaId),
  );

  ipcMain.handle('metodi_pagamento:list', () => listMetodi(db));
  ipcMain.handle('metodi_pagamento:create', (_e, { nome }: { nome: string }) =>
    createMetodo(db, nome),
  );
  ipcMain.handle('metodi_pagamento:delete', (_e, { id }: { id: number }) =>
    deleteMetodo(db, id),
  );

  ipcMain.handle('dettagli:list', () => listDettagli(db));
  ipcMain.handle('dettagli:list-per-frequenza', () => getDettagliOrdinatiPerFrequenza(db));
  ipcMain.handle('dettagli:create', (_e, { nome, categoria_id }: { nome: string; categoria_id?: number }) =>
    createDettaglio(db, nome, categoria_id),
  );
  ipcMain.handle('dettagli:update', (_e, { id, nome, categoria_id }: { id: number; nome: string; categoria_id?: number }) =>
    updateDettaglio(db, id, nome, categoria_id),
  );
  ipcMain.handle('dettagli:delete', (_e, { id, targetDettaglioId }: { id: number; targetDettaglioId: number }) =>
    deleteDettaglio(db, id, targetDettaglioId),
  );
  ipcMain.handle('dettagli:update-categoria', (_e, { id, categoria_id }: { id: number; categoria_id: number | null }) =>
    updateDettaglioCategoria(db, id, categoria_id),
  );
  ipcMain.handle('dettagli:count-movimenti', (_e, { id }: { id: number }) =>
    countMovimentiByDettaglio(db, id),
  );

  ipcMain.handle('movimenti:list', (_e, filters: MovimentoFilters = {}) =>
    listMovimenti(db, filters),
  );
  ipcMain.handle('movimenti:create', (_e, data: MovimentoCreate) =>
    createMovimento(db, data),
  );
  ipcMain.handle('movimenti:update', (_e, { id, ...data }: { id: number } & MovimentoUpdate) =>
    updateMovimento(db, id, data),
  );
  ipcMain.handle(
    'movimenti:createConDettaglio',
    (_e, { data, opts }: { data: MovimentoCreate; opts: SalvaMovimentoDettaglioOpts }) =>
      createMovimentoConDettaglio(db, data, opts),
  );
  ipcMain.handle(
    'movimenti:updateConDettaglio',
    (_e, { id, data, opts }: { id: number; data: MovimentoUpdate; opts: SalvaMovimentoDettaglioOpts }) =>
      updateMovimentoConDettaglio(db, id, data, opts),
  );
  ipcMain.handle('movimenti:delete', (_e, { id }: { id: number }) =>
    deleteMovimento(db, id),
  );
  ipcMain.handle('movimenti:restore', (_e, movimento: Movimento) =>
    restoreMovimento(db, movimento),
  );
  ipcMain.handle('movimenti:deleteAll', (_e, filters: MovimentoFilters = {}) =>
    deleteAllMovimenti(db, filters),
  );

  ipcMain.handle('dashboard:kpi', (_e, { anno }: { anno: number }) =>
    getDashboardKPI(db, anno),
  );
  ipcMain.handle('dashboard:serie-mensili', (_e, { anno }: { anno: number }) =>
    getSerieMensili(db, anno),
  );
  ipcMain.handle('dashboard:breakdown-categorie', (_e, { anno }: { anno: number }) =>
    getBreakdownCategorie(db, anno),
  );
  ipcMain.handle('dashboard:trend-yoy', (_e, { anno }: { anno: number }) =>
    getTrendYoY(db, anno),
  );
  ipcMain.handle('dashboard:riepilogo-mensile', (_e, { anno }: { anno: number }) =>
    getRiepilogoMensile(db, anno),
  );
  ipcMain.handle('dashboard:trend-mensile', (_e, { anno }: { anno: number }) =>
    getTrendMensile(db, anno),
  );
  ipcMain.handle(
    'dashboard:pivot-categorie',
    (_e, { anno, tipo }: { anno: number; tipo: 'uscita' | 'entrata' }) =>
      getPivotCategorie(db, anno, tipo),
  );
}

export function registerPatrimonioHandlers(
  ipcMain: IpcMain,
  db: Database.Database,
): void {
  ipcMain.handle('patrimonio:get-granularita', () => getGranularita(db));
  ipcMain.handle('patrimonio:set-granularita', (_e, { valore }: { valore: Granularita }) =>
    setGranularita(db, valore),
  );
  ipcMain.handle('patrimonio:list-gruppi', () => {
    try {
      return listGruppi(db);
    } catch (err) {
      throw new Error(`patrimonio:list-gruppi failed: ${String(err)}`);
    }
  });
  ipcMain.handle(
    'patrimonio:create-gruppo',
    (_e, { nome, tipo, ordine }: { nome: string; tipo: 'attivo' | 'passivo'; ordine?: number }) => {
      try {
        return createGruppo(db, nome, tipo, ordine ?? 0);
      } catch (err) {
        throw new Error(`patrimonio:create-gruppo failed: ${String(err)}`);
      }
    },
  );
  ipcMain.handle(
    'patrimonio:update-gruppo',
    (_e, { id, nome, ordine }: { id: number; nome: string; ordine?: number }) => {
      try {
        return updateGruppo(db, id, nome, ordine);
      } catch (err) {
        throw new Error(`patrimonio:update-gruppo failed: ${String(err)}`);
      }
    },
  );
  ipcMain.handle('patrimonio:delete-gruppo', (_e, { id }: { id: number }) => {
    try {
      return deleteGruppo(db, id);
    } catch (err) {
      throw new Error(`patrimonio:delete-gruppo failed: ${String(err)}`);
    }
  });
  ipcMain.handle(
    'patrimonio:list-voci',
    (_e, { soloAttive, anno }: { soloAttive: boolean; anno?: number }) => {
      try {
        return listVoci(db, soloAttive, anno);
      } catch (err) {
        throw new Error(`patrimonio:list-voci failed: ${String(err)}`);
      }
    },
  );
  ipcMain.handle(
    'patrimonio:create-voce',
    (_e, { nome, tipo, gruppoNome, ordine }: { nome: string; tipo: 'attivo' | 'passivo'; gruppoNome?: string; ordine?: number }) => {
      try {
        const gruppoId = gruppoNome?.trim() ? findOrCreateGruppo(db, gruppoNome, tipo).id : null;
        return createVoce(db, nome, tipo, gruppoId, ordine ?? 0);
      } catch (err) {
        throw new Error(`patrimonio:create-voce failed: ${String(err)}`);
      }
    },
  );
  ipcMain.handle(
    'patrimonio:update-voce',
    (_e, { id, nome, gruppoNome, ordine }: { id: number; nome?: string; gruppoNome?: string | null; ordine?: number }) => {
      try {
        const updates: { nome?: string; gruppo_id?: number | null; ordine?: number } = {};
        if (nome !== undefined) updates.nome = nome;
        if (ordine !== undefined) updates.ordine = ordine;
        if (gruppoNome !== undefined) {
          if (!gruppoNome?.trim()) {
            updates.gruppo_id = null;
          } else {
            const voce = db
              .prepare('SELECT tipo FROM patrimonio_voci WHERE id = ?')
              .get(id) as { tipo: 'attivo' | 'passivo' } | undefined;
            if (!voce) throw new Error(`Voce con id=${id} non trovata`);
            updates.gruppo_id = findOrCreateGruppo(db, gruppoNome, voce.tipo).id;
          }
        }
        return updateVoce(db, id, updates);
      } catch (err) {
        if (err instanceof Error) throw err;
        throw new Error(`patrimonio:update-voce failed: ${String(err)}`);
      }
    },
  );
  ipcMain.handle('patrimonio:archive-voce', (_e, { id, anno }: { id: number; anno: number }) => {
    try {
      return archiveVoce(db, id, anno);
    } catch (err) {
      throw new Error(`patrimonio:archive-voce failed: ${String(err)}`);
    }
  });
  ipcMain.handle('patrimonio:restore-voce', (_e, { id }: { id: number }) => {
    try {
      return restoreVoce(db, id);
    } catch (err) {
      throw new Error(`patrimonio:restore-voce failed: ${String(err)}`);
    }
  });
  ipcMain.handle('patrimonio:list-valori', (_e, { anno }: { anno: number }) => {
    try {
      return listValoriPerAnno(db, anno);
    } catch (err) {
      throw new Error(`patrimonio:list-valori failed: ${String(err)}`);
    }
  });
  ipcMain.handle(
    'patrimonio:upsert-valore',
    (_e, { voceId, anno, mese, importo }: { voceId: number; anno: number; mese: number; importo: number }) => {
      try {
        return upsertValore(db, voceId, anno, mese, importo);
      } catch (err) {
        throw new Error(`patrimonio:upsert-valore failed: ${String(err)}`);
      }
    },
  );
  ipcMain.handle(
    'patrimonio:delete-valore',
    (_e, { voceId, anno, mese }: { voceId: number; anno: number; mese: number }) => {
      try {
        return deleteValore(db, voceId, anno, mese);
      } catch (err) {
        throw new Error(`patrimonio:delete-valore failed: ${String(err)}`);
      }
    },
  );
  ipcMain.handle('patrimonio:get-kpi', (_e, { anno }: { anno: number }) => {
    try {
      return getKpiPatrimonio(db, anno);
    } catch (err) {
      throw new Error(`patrimonio:get-kpi failed: ${String(err)}`);
    }
  });
  ipcMain.handle(
    'patrimonio:count-valori-nascosti',
    (_e, { anno, nuovaGranularita }: { anno: number; nuovaGranularita: Granularita }) => {
      try {
        return countValoriNascosti(db, anno, nuovaGranularita);
      } catch (err) {
        throw new Error(`patrimonio:count-valori-nascosti failed: ${String(err)}`);
      }
    },
  );
  ipcMain.handle('patrimonio:get-storico', () => {
    try {
      return getStorico(db);
    } catch (err) {
      throw new Error(`patrimonio:get-storico failed: ${String(err)}`);
    }
  });
}
