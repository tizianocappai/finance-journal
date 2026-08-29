import type Database from 'better-sqlite3';

export function getImpostazione(db: Database.Database, chiave: string): string | null {
  try {
    const row = db
      .prepare('SELECT valore FROM impostazioni WHERE chiave = ?')
      .get(chiave) as { valore: string } | undefined;
    return row?.valore ?? null;
  } catch (err) {
    throw new Error(`Failed to get impostazione "${chiave}": ${String(err)}`);
  }
}

export function setImpostazione(db: Database.Database, chiave: string, valore: string): void {
  try {
    db.prepare(`
      INSERT INTO impostazioni (chiave, valore, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(chiave) DO UPDATE SET
        valore     = excluded.valore,
        updated_at = excluded.updated_at
    `).run(chiave, valore);
  } catch (err) {
    throw new Error(`Failed to set impostazione "${chiave}": ${String(err)}`);
  }
}
