import type Database from 'better-sqlite3';
import type { Dettaglio, DettaglioConFrequenza } from './types';

export function listDettagli(db: Database.Database): Dettaglio[] {
  try {
    return db
      .prepare('SELECT * FROM dettagli ORDER BY nome')
      .all() as Dettaglio[];
  } catch (err) {
    throw new Error(`Failed to list dettagli: ${String(err)}`);
  }
}

export function getDettagliOrdinatiPerFrequenza(db: Database.Database): DettaglioConFrequenza[] {
  try {
    return db
      .prepare(
        `SELECT d.*, COUNT(m.id) AS uso_count
         FROM dettagli d
         LEFT JOIN movimenti m ON m.dettaglio_id = d.id
         GROUP BY d.id
         ORDER BY uso_count DESC, d.nome ASC`,
      )
      .all() as DettaglioConFrequenza[];
  } catch (err) {
    throw new Error(`Failed to list dettagli per frequenza: ${String(err)}`);
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

export function updateDettaglio(
  db: Database.Database,
  id: number,
  nome: string,
  categoria_id?: number,
): Dettaglio {
  try {
    const existing = db
      .prepare('SELECT * FROM dettagli WHERE id = ?')
      .get(id) as Dettaglio | undefined;
    if (!existing) throw new Error(`Dettaglio con id=${id} non trovato`);

    const row = db
      .prepare(
        `UPDATE dettagli SET nome = ?, categoria_id = ? WHERE id = ? RETURNING *`,
      )
      .get(nome, categoria_id ?? existing.categoria_id, id) as Dettaglio | undefined;

    if (!row) throw new Error(`Dettaglio con id=${id} non trovato`);
    return row;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to update dettaglio id=${id}: ${String(err)}`);
  }
}

export function deleteDettaglio(
  db: Database.Database,
  id: number,
  targetDettaglioId: number,
): void {
  try {
    const det = db
      .prepare('SELECT * FROM dettagli WHERE id = ?')
      .get(id) as Dettaglio | undefined;

    if (!det) throw new Error(`Dettaglio con id=${id} non trovato`);

    const target = db
      .prepare('SELECT id FROM dettagli WHERE id = ?')
      .get(targetDettaglioId) as { id: number } | undefined;

    if (!target) throw new Error(`Dettaglio target con id=${targetDettaglioId} non trovato`);

    db.transaction(() => {
      db.prepare('UPDATE movimenti SET dettaglio_id = ? WHERE dettaglio_id = ?').run(targetDettaglioId, id);
      db.prepare('DELETE FROM dettagli WHERE id = ?').run(id);
    })();
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to delete dettaglio id=${id}: ${String(err)}`);
  }
}

export function countMovimentiByDettaglio(db: Database.Database, id: number): number {
  try {
    const row = db
      .prepare('SELECT COUNT(*) as cnt FROM movimenti WHERE dettaglio_id = ?')
      .get(id) as { cnt: number };
    return row.cnt;
  } catch (err) {
    throw new Error(`Failed to count movimenti for dettaglio id=${id}: ${String(err)}`);
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
