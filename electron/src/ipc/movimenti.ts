import type Database from 'better-sqlite3';
import type {
  Movimento,
  MovimentoWithLookup,
  MovimentoFilters,
  MovimentoCreate,
  MovimentoUpdate,
} from './types';

export function listMovimenti(
  db: Database.Database,
  filters: MovimentoFilters = {},
): MovimentoWithLookup[] {
  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.anno != null) {
      conditions.push(`strftime('%Y', m.data) = ?`);
      params.push(String(filters.anno));
    }
    if (filters.mese != null) {
      conditions.push(`strftime('%m', m.data) = ?`);
      params.push(String(filters.mese).padStart(2, '0'));
    }
    if (filters.tipo) {
      conditions.push(`m.tipo = ?`);
      params.push(filters.tipo);
    }
    if (filters.categoria_id != null) {
      conditions.push(`m.categoria_id = ?`);
      params.push(filters.categoria_id);
    }
    if (filters.metodo_id != null) {
      conditions.push(`m.metodo_id = ?`);
      params.push(filters.metodo_id);
    }
    if (filters.testo) {
      conditions.push(`m.descrizione LIKE ?`);
      params.push(`%${filters.testo}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        m.*,
        c.nome  AS categoria_nome,
        mp.nome AS metodo_nome,
        d.nome  AS dettaglio_nome
      FROM movimenti m
      LEFT JOIN categorie c           ON c.id  = m.categoria_id
      LEFT JOIN metodi_pagamento mp   ON mp.id = m.metodo_id
      LEFT JOIN dettagli d            ON d.id  = m.dettaglio_id
      ${where}
      ORDER BY m.data DESC, m.id DESC
    `;

    return db.prepare(sql).all(...params) as MovimentoWithLookup[];
  } catch (err) {
    throw new Error(`Failed to list movimenti: ${String(err)}`);
  }
}

export function createMovimento(
  db: Database.Database,
  data: MovimentoCreate,
): Movimento {
  try {
    const row = db
      .prepare(
        `INSERT INTO movimenti (data, importo, tipo, descrizione, categoria_id, metodo_id, dettaglio_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         RETURNING *`,
      )
      .get(
        data.data,
        data.importo,
        data.tipo,
        data.descrizione ?? null,
        data.categoria_id ?? null,
        data.metodo_id ?? null,
        data.dettaglio_id ?? null,
      ) as Movimento;
    return row;
  } catch (err) {
    throw new Error(`Failed to create movimento: ${String(err)}`);
  }
}

function assertMovimentoExists(db: Database.Database, id: number): void {
  const existing = db.prepare('SELECT id FROM movimenti WHERE id = ?').get(id);
  if (!existing) throw new Error(`Movimento con id=${id} non trovato`);
}

export function updateMovimento(
  db: Database.Database,
  id: number,
  data: MovimentoUpdate,
): Movimento {
  try {
    assertMovimentoExists(db, id);

    const row = db
      .prepare(
        `UPDATE movimenti
         SET data         = ?,
             importo      = ?,
             tipo         = ?,
             descrizione  = ?,
             categoria_id = ?,
             metodo_id    = ?,
             dettaglio_id = ?,
             updated_at   = datetime('now')
         WHERE id = ?
         RETURNING *`,
      )
      .get(
        data.data,
        data.importo,
        data.tipo,
        data.descrizione ?? null,
        data.categoria_id ?? null,
        data.metodo_id ?? null,
        data.dettaglio_id ?? null,
        id,
      ) as Movimento;
    return row;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to update movimento id=${id}: ${String(err)}`);
  }
}

export function deleteMovimento(db: Database.Database, id: number): void {
  try {
    assertMovimentoExists(db, id);
    db.prepare('DELETE FROM movimenti WHERE id = ?').run(id);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to delete movimento id=${id}: ${String(err)}`);
  }
}

export function deleteAllMovimenti(
  db: Database.Database,
  filters: MovimentoFilters = {},
): Movimento[] {
  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.anno != null) {
      conditions.push(`strftime('%Y', data) = ?`);
      params.push(String(filters.anno));
    }
    if (filters.mese != null) {
      conditions.push(`strftime('%m', data) = ?`);
      params.push(String(filters.mese).padStart(2, '0'));
    }
    if (filters.tipo) {
      conditions.push(`tipo = ?`);
      params.push(filters.tipo);
    }
    if (filters.categoria_id != null) {
      conditions.push(`categoria_id = ?`);
      params.push(filters.categoria_id);
    }
    if (filters.metodo_id != null) {
      conditions.push(`metodo_id = ?`);
      params.push(filters.metodo_id);
    }
    if (filters.testo) {
      conditions.push(`descrizione LIKE ?`);
      params.push(`%${filters.testo}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const execute = db.transaction(() => {
      const rows = db.prepare(`SELECT * FROM movimenti ${where}`).all(...params) as Movimento[];
      db.prepare(`DELETE FROM movimenti ${where}`).run(...params);
      return rows;
    });
    return execute();
  } catch (err) {
    throw new Error(`Failed to delete all movimenti: ${String(err)}`);
  }
}

export function restoreMovimento(db: Database.Database, movimento: Movimento): void {
  try {
    db
      .prepare(
        `INSERT OR REPLACE INTO movimenti
           (id, data, importo, tipo, descrizione, categoria_id, metodo_id, dettaglio_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        movimento.id,
        movimento.data,
        movimento.importo,
        movimento.tipo,
        movimento.descrizione ?? null,
        movimento.categoria_id ?? null,
        movimento.metodo_id ?? null,
        movimento.dettaglio_id ?? null,
        movimento.created_at,
        movimento.updated_at,
      );
  } catch (err) {
    throw new Error(`Failed to restore movimento id=${movimento.id}: ${String(err)}`);
  }
}
