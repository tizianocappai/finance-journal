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

export function deleteCategoria(db: Database.Database, id: number): void {
  try {
    const cat = db
      .prepare('SELECT * FROM categorie WHERE id = ?')
      .get(id) as Categoria | undefined;

    if (!cat) throw new Error(`Categoria con id=${id} non trovata`);
    if (cat.predefinita) throw new Error(`Categoria predefinita non eliminabile`);

    const altro = db
      .prepare(`SELECT id FROM categorie WHERE nome = 'Altro'`)
      .get() as { id: number } | undefined;

    if (!altro) throw new Error(`Categoria "Altro" non trovata — impossibile riassegnare i movimenti`);

    db.transaction(() => {
      db.prepare(
        'UPDATE movimenti SET categoria_id = ? WHERE categoria_id = ?',
      ).run(altro.id, id);
      db.prepare('DELETE FROM categorie WHERE id = ?').run(id);
    })();
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to delete categoria id=${id}: ${String(err)}`);
  }
}
