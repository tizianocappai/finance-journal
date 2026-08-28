import type Database from 'better-sqlite3';
import type { MetodoPagamento } from './types';

export function listMetodi(db: Database.Database): MetodoPagamento[] {
  try {
    return db
      .prepare('SELECT * FROM metodi_pagamento ORDER BY nome')
      .all() as MetodoPagamento[];
  } catch (err) {
    throw new Error(`Failed to list metodi_pagamento: ${String(err)}`);
  }
}

export function createMetodo(
  db: Database.Database,
  nome: string,
): MetodoPagamento {
  try {
    const row = db
      .prepare(
        `INSERT INTO metodi_pagamento (nome, predefinito)
         VALUES (?, 0)
         RETURNING *`,
      )
      .get(nome) as MetodoPagamento;
    return row;
  } catch (err) {
    throw new Error(`Failed to create metodo "${nome}": ${String(err)}`);
  }
}

export function deleteMetodo(db: Database.Database, id: number): void {
  try {
    const metodo = db
      .prepare('SELECT * FROM metodi_pagamento WHERE id = ?')
      .get(id) as MetodoPagamento | undefined;

    if (!metodo) throw new Error(`Metodo di pagamento con id=${id} non trovato`);
    if (metodo.predefinito) throw new Error(`Metodo predefinito non eliminabile`);

    db.transaction(() => {
      db.prepare('UPDATE movimenti SET metodo_id = NULL WHERE metodo_id = ?').run(id);
      db.prepare('DELETE FROM metodi_pagamento WHERE id = ?').run(id);
    })();
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to delete metodo id=${id}: ${String(err)}`);
  }
}
