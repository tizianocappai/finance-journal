import type Database from 'better-sqlite3';

export const CHIAVI = {
  SALDO_INIZIALE_IMPORTO: 'saldo_iniziale_importo',
  SALDO_INIZIALE_DATA: 'saldo_iniziale_data',
} as const;

export function getSaldoIniziale(db: Database.Database, anno: number): number {
  try {
    const importoStr = getImpostazione(db, CHIAVI.SALDO_INIZIALE_IMPORTO);
    const dataStr = getImpostazione(db, CHIAVI.SALDO_INIZIALE_DATA);
    if (!importoStr || !dataStr || dataStr.length < 4) return 0;
    const annoSaldo = parseInt(dataStr.slice(0, 4), 10);
    if (isNaN(annoSaldo) || annoSaldo > anno) return 0;
    const importo = parseFloat(importoStr);
    return isNaN(importo) ? 0 : importo;
  } catch (err) {
    throw new Error(`Failed to get saldo iniziale: ${String(err)}`);
  }
}

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
