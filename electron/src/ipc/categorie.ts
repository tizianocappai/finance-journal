import type Database from 'better-sqlite3';
import type { Categoria } from './types';

export function listCategorie(db: Database.Database): Categoria[] {
  try {
    return db
      .prepare('SELECT * FROM categorie ORDER BY nome')
      .all() as Categoria[];
  } catch (err) {
    throw new Error(`Failed to list categorie: ${String(err)}`);
  }
}

export function createCategoria(
  db: Database.Database,
  nome: string,
  colore?: string,
  icona?: string,
): Categoria {
  try {
    const row = db
      .prepare(
        `INSERT INTO categorie (nome, colore, icona, predefinita)
         VALUES (?, ?, ?, 0)
         RETURNING *`,
      )
      .get(nome, colore ?? null, icona ?? null) as Categoria;
    return row;
  } catch (err) {
    throw new Error(`Failed to create categoria "${nome}": ${String(err)}`);
  }
}

export function updateCategoria(
  db: Database.Database,
  id: number,
  nome: string,
  colore?: string,
  icona?: string,
): Categoria {
  try {
    const row = db
      .prepare(
        `UPDATE categorie SET nome = ?, colore = ?, icona = ? WHERE id = ? RETURNING *`,
      )
      .get(nome, colore ?? null, icona ?? null, id) as Categoria | undefined;

    if (!row) throw new Error(`Categoria con id=${id} non trovata`);
    return row;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to update categoria id=${id}: ${String(err)}`);
  }
}

export function countMovimentiByCategoria(db: Database.Database, id: number): number {
  try {
    const row = db
      .prepare('SELECT COUNT(*) as cnt FROM movimenti WHERE categoria_id = ?')
      .get(id) as { cnt: number };
    return row.cnt;
  } catch (err) {
    throw new Error(`Failed to count movimenti for categoria id=${id}: ${String(err)}`);
  }
}

export function deleteCategoria(
  db: Database.Database,
  id: number,
  targetCategoriaId: number,
): void {
  try {
    const cat = db
      .prepare('SELECT * FROM categorie WHERE id = ?')
      .get(id) as Categoria | undefined;

    if (!cat) throw new Error(`Categoria con id=${id} non trovata`);

    const target = db
      .prepare('SELECT id FROM categorie WHERE id = ?')
      .get(targetCategoriaId) as { id: number } | undefined;

    if (!target) throw new Error(`Categoria target con id=${targetCategoriaId} non trovata`);

    db.transaction(() => {
      db.prepare(
        'UPDATE movimenti SET categoria_id = ? WHERE categoria_id = ?',
      ).run(targetCategoriaId, id);
      db.prepare('DELETE FROM categorie WHERE id = ?').run(id);
    })();
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to delete categoria id=${id}: ${String(err)}`);
  }
}
