import type { IpcMain } from 'electron';
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
} from './movimenti';
import type { MovimentoFilters, MovimentoCreate, MovimentoUpdate } from './types';

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
}
