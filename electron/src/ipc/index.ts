import type { IpcMain } from 'electron';
import { dialog, app } from 'electron';
import type Database from 'better-sqlite3';
import { listCategorie, createCategoria, deleteCategoria } from './categorie';
import { listMetodi, createMetodo, deleteMetodo } from './metodi_pagamento';
import {
  listDettagli,
  createDettaglio,
  deleteDettaglio,
  updateDettaglioCategoria,
} from './dettagli';
import {
  listMovimenti,
  createMovimento,
  updateMovimento,
  deleteMovimento,
  restoreMovimento,
  deleteAllMovimenti,
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
import { getImpostazione, setImpostazione } from './impostazioni';
import type { Movimento, MovimentoFilters, MovimentoCreate, MovimentoUpdate } from './types';

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
}

export function registerLookupHandlers(
  ipcMain: IpcMain,
  db: Database.Database,
): void {
  ipcMain.handle('categorie:list', () => listCategorie(db));
  ipcMain.handle('categorie:create', (_e, { nome, colore, icona }: { nome: string; colore?: string; icona?: string }) =>
    createCategoria(db, nome, colore, icona),
  );
  ipcMain.handle('categorie:delete', (_e, { id }: { id: number }) =>
    deleteCategoria(db, id),
  );

  ipcMain.handle('metodi_pagamento:list', () => listMetodi(db));
  ipcMain.handle('metodi_pagamento:create', (_e, { nome }: { nome: string }) =>
    createMetodo(db, nome),
  );
  ipcMain.handle('metodi_pagamento:delete', (_e, { id }: { id: number }) =>
    deleteMetodo(db, id),
  );

  ipcMain.handle('dettagli:list', () => listDettagli(db));
  ipcMain.handle('dettagli:create', (_e, { nome, categoria_id }: { nome: string; categoria_id?: number }) =>
    createDettaglio(db, nome, categoria_id),
  );
  ipcMain.handle('dettagli:delete', (_e, { id }: { id: number }) =>
    deleteDettaglio(db, id),
  );
  ipcMain.handle('dettagli:update-categoria', (_e, { id, categoria_id }: { id: number; categoria_id: number | null }) =>
    updateDettaglioCategoria(db, id, categoria_id),
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
