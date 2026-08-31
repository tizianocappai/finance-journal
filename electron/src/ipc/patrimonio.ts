import type Database from 'better-sqlite3';
import { getImpostazione, setImpostazione } from './impostazioni';
import type { Granularita, KpiPatrimonio, PatrimonioGruppo, PatrimonioValore, PatrimonioVoce } from './types';

// --- Gruppi ---

export function listGruppi(db: Database.Database): PatrimonioGruppo[] {
  try {
    return db
      .prepare('SELECT * FROM patrimonio_gruppi ORDER BY tipo, ordine, nome')
      .all() as PatrimonioGruppo[];
  } catch (err) {
    throw new Error(`Failed to list gruppi: ${String(err)}`);
  }
}

export function createGruppo(
  db: Database.Database,
  nome: string,
  tipo: 'attivo' | 'passivo',
  ordine = 0,
): PatrimonioGruppo {
  try {
    const row = db
      .prepare(
        `INSERT INTO patrimonio_gruppi (nome, tipo, ordine) VALUES (?, ?, ?) RETURNING *`,
      )
      .get(nome, tipo, ordine) as PatrimonioGruppo;
    return row;
  } catch (err) {
    throw new Error(`Failed to create gruppo "${nome}": ${String(err)}`);
  }
}

export function updateGruppo(
  db: Database.Database,
  id: number,
  nome: string,
  ordine?: number,
): PatrimonioGruppo {
  try {
    const existing = db
      .prepare('SELECT * FROM patrimonio_gruppi WHERE id = ?')
      .get(id) as PatrimonioGruppo | undefined;
    if (!existing) throw new Error(`Gruppo con id=${id} non trovato`);

    const row = db
      .prepare(
        `UPDATE patrimonio_gruppi SET nome = ?, ordine = ? WHERE id = ? RETURNING *`,
      )
      .get(nome, ordine ?? existing.ordine, id) as PatrimonioGruppo;
    return row;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to update gruppo id=${id}: ${String(err)}`);
  }
}

export function deleteGruppo(db: Database.Database, id: number): void {
  try {
    const row = db
      .prepare('SELECT id FROM patrimonio_gruppi WHERE id = ?')
      .get(id) as { id: number } | undefined;
    if (!row) throw new Error(`Gruppo con id=${id} non trovato`);
    db.prepare('DELETE FROM patrimonio_gruppi WHERE id = ?').run(id);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to delete gruppo id=${id}: ${String(err)}`);
  }
}

// --- Voci ---

export function listVoci(db: Database.Database, soloAttive = true): PatrimonioVoce[] {
  try {
    const sql = soloAttive
      ? 'SELECT * FROM patrimonio_voci WHERE attiva = 1 ORDER BY tipo, ordine, nome'
      : 'SELECT * FROM patrimonio_voci ORDER BY tipo, ordine, nome';
    return db.prepare(sql).all() as PatrimonioVoce[];
  } catch (err) {
    throw new Error(`Failed to list voci: ${String(err)}`);
  }
}

export function createVoce(
  db: Database.Database,
  nome: string,
  tipo: 'attivo' | 'passivo',
  gruppo_id: number | null = null,
  ordine = 0,
): PatrimonioVoce {
  try {
    const row = db
      .prepare(
        `INSERT INTO patrimonio_voci (nome, tipo, gruppo_id, ordine) VALUES (?, ?, ?, ?) RETURNING *`,
      )
      .get(nome, tipo, gruppo_id, ordine) as PatrimonioVoce;
    return row;
  } catch (err) {
    throw new Error(`Failed to create voce "${nome}": ${String(err)}`);
  }
}

export function updateVoce(
  db: Database.Database,
  id: number,
  updates: { nome?: string; gruppo_id?: number | null; ordine?: number },
): PatrimonioVoce {
  try {
    const existing = db
      .prepare('SELECT * FROM patrimonio_voci WHERE id = ?')
      .get(id) as PatrimonioVoce | undefined;
    if (!existing) throw new Error(`Voce con id=${id} non trovata`);

    const row = db
      .prepare(
        `UPDATE patrimonio_voci SET nome = ?, gruppo_id = ?, ordine = ? WHERE id = ? RETURNING *`,
      )
      .get(
        updates.nome ?? existing.nome,
        'gruppo_id' in updates ? updates.gruppo_id ?? null : existing.gruppo_id,
        updates.ordine ?? existing.ordine,
        id,
      ) as PatrimonioVoce;
    return row;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to update voce id=${id}: ${String(err)}`);
  }
}

export function archiveVoce(db: Database.Database, id: number): void {
  try {
    const info = db.prepare('UPDATE patrimonio_voci SET attiva = 0 WHERE id = ?').run(id);
    if (info.changes === 0) throw new Error(`Voce con id=${id} non trovata`);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to archive voce id=${id}: ${String(err)}`);
  }
}

export function restoreVoce(db: Database.Database, id: number): void {
  try {
    const info = db.prepare('UPDATE patrimonio_voci SET attiva = 1 WHERE id = ?').run(id);
    if (info.changes === 0) throw new Error(`Voce con id=${id} non trovata`);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to restore voce id=${id}: ${String(err)}`);
  }
}

// --- Valori ---

export function upsertValore(
  db: Database.Database,
  voce_id: number,
  anno: number,
  mese: number,
  importo: number,
): PatrimonioValore {
  try {
    const row = db
      .prepare(
        `INSERT OR REPLACE INTO patrimonio_valori (voce_id, anno, mese, importo) VALUES (?, ?, ?, ?) RETURNING *`,
      )
      .get(voce_id, anno, mese, importo) as PatrimonioValore;
    return row;
  } catch (err) {
    throw new Error(`Failed to upsert valore voce_id=${voce_id} anno=${anno} mese=${mese}: ${String(err)}`);
  }
}

export function deleteValore(
  db: Database.Database,
  voce_id: number,
  anno: number,
  mese: number,
): void {
  try {
    db
      .prepare('DELETE FROM patrimonio_valori WHERE voce_id = ? AND anno = ? AND mese = ?')
      .run(voce_id, anno, mese);
  } catch (err) {
    throw new Error(`Failed to delete valore voce_id=${voce_id} anno=${anno} mese=${mese}: ${String(err)}`);
  }
}

export function listValoriPerAnno(
  db: Database.Database,
  anno: number,
): PatrimonioValore[] {
  try {
    return db
      .prepare('SELECT * FROM patrimonio_valori WHERE anno = ? ORDER BY voce_id, mese')
      .all(anno) as PatrimonioValore[];
  } catch (err) {
    throw new Error(`Failed to list valori per anno ${anno}: ${String(err)}`);
  }
}

// --- KPI ---

export function getKpiPatrimonio(db: Database.Database, anno: number): KpiPatrimonio {
  try {
    // Per ogni voce prende solo il valore del mese più recente disponibile,
    // poi somma questi per tipo. Non somma tutti i mesi per voce.
    const rows = db
      .prepare(
        `SELECT pv.tipo, SUM(val.importo) as totale
         FROM patrimonio_valori val
         INNER JOIN (
           SELECT voce_id, MAX(mese) AS max_mese
           FROM patrimonio_valori
           WHERE anno = ?
           GROUP BY voce_id
         ) newest ON val.voce_id = newest.voce_id
                  AND val.mese = newest.max_mese
                  AND val.anno = ?
         JOIN patrimonio_voci pv ON pv.id = val.voce_id
         GROUP BY pv.tipo`,
      )
      .all(anno, anno) as Array<{ tipo: string; totale: number }>;

    const totaleAttivi = rows.find((r) => r.tipo === 'attivo')?.totale ?? 0;
    const totalePassivi = rows.find((r) => r.tipo === 'passivo')?.totale ?? 0;
    return {
      totaleAttivi,
      totalePassivi,
      patrimonioNetto: totaleAttivi - totalePassivi,
    };
  } catch (err) {
    throw new Error(`Failed to get KPI patrimonio anno=${anno}: ${String(err)}`);
  }
}

// --- Granularità ---

const CHIAVE_GRANULARITA = 'patrimonio_granularita';

export function getGranularita(db: Database.Database): Granularita {
  try {
    const val = getImpostazione(db, CHIAVE_GRANULARITA);
    return val === 'quarter' ? 'quarter' : 'mese';
  } catch (err) {
    throw new Error(`Failed to get granularita: ${String(err)}`);
  }
}

export function setGranularita(db: Database.Database, valore: Granularita): void {
  try {
    setImpostazione(db, CHIAVE_GRANULARITA, valore);
  } catch (err) {
    throw new Error(`Failed to set granularita: ${String(err)}`);
  }
}

const QUARTER_END_MONTHS = [3, 6, 9, 12];

export function countValoriNascosti(db: Database.Database, anno: number, nuovaGranularita: Granularita): number {
  try {
    if (nuovaGranularita === 'mese') return 0;
    const placeholders = QUARTER_END_MONTHS.map(() => '?').join(',');
    const row = db
      .prepare(`SELECT COUNT(*) as cnt FROM patrimonio_valori WHERE anno = ? AND mese NOT IN (${placeholders})`)
      .get(anno, ...QUARTER_END_MONTHS) as { cnt: number };
    return row.cnt;
  } catch (err) {
    throw new Error(`Failed to count valori nascosti anno=${anno}: ${String(err)}`);
  }
}

// --- Helpers ---

export function findOrCreateGruppo(
  db: Database.Database,
  nome: string,
  tipo: 'attivo' | 'passivo',
): PatrimonioGruppo {
  try {
    const trimmed = nome.trim();
    const all = db
      .prepare('SELECT * FROM patrimonio_gruppi WHERE tipo = ?')
      .all(tipo) as PatrimonioGruppo[];
    const existing = all.find((g) => g.nome.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    return createGruppo(db, trimmed, tipo);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to find or create gruppo "${nome}": ${String(err)}`);
  }
}
