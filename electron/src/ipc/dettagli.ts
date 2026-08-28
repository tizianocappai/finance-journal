import type Database from 'better-sqlite3';
import type { Dettaglio } from './types';

export function listDettagli(db: Database.Database): Dettaglio[] {
  try {
    return db
      .prepare('SELECT * FROM dettagli ORDER BY nome')
      .all() as Dettaglio[];
  } catch (err) {
    throw new Error(`Failed to list dettagli: ${String(err)}`);
  }
}

export function createDettaglio(
  db: Database.Database,
  nome: string,
  categoria_id?: number,
): Dettaglio {
  try {
    const row = db
      .prepare(
        `INSERT INTO dettagli (nome, categoria_id, predefinito)
         VALUES (?, ?, 0)
         RETURNING *`,
      )
      .get(nome, categoria_id ?? null) as Dettaglio;
    return row;
  } catch (err) {
    throw new Error(`Failed to create dettaglio "${nome}": ${String(err)}`);
  }
}

export function deleteDettaglio(db: Database.Database, id: number): void {
  try {
    const det = db
      .prepare('SELECT * FROM dettagli WHERE id = ?')
      .get(id) as Dettaglio | undefined;

    if (!det) throw new Error(`Dettaglio con id=${id} non trovato`);
    if (det.predefinito) throw new Error(`Dettaglio predefinito non eliminabile`);

    db.transaction(() => {
      db.prepare('UPDATE movimenti SET dettaglio_id = NULL WHERE dettaglio_id = ?').run(id);
      db.prepare('DELETE FROM dettagli WHERE id = ?').run(id);
    })();
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to delete dettaglio id=${id}: ${String(err)}`);
  }
}

export function updateDettaglioCategoria(
  db: Database.Database,
  id: number,
  categoria_id: number | null,
): Dettaglio {
  try {
    const row = db
      .prepare(
        `UPDATE dettagli SET categoria_id = ? WHERE id = ? RETURNING *`,
      )
      .get(categoria_id, id) as Dettaglio | undefined;

    if (!row) throw new Error(`Dettaglio con id=${id} non trovato`);
    return row;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to update dettaglio id=${id}: ${String(err)}`);
  }
}
