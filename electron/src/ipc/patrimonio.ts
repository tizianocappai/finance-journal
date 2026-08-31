import type Database from 'better-sqlite3';
import { getImpostazione, setImpostazione } from './impostazioni';
import type { Granularita, KpiPatrimonio, PatrimonioGruppo, PatrimonioStorico, PatrimonioValore, PatrimonioVoce } from './types';

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

export function listVoci(db: Database.Database, soloAttive = true, anno?: number): PatrimonioVoce[] {
  try {
    if (anno !== undefined) {
      // Archiviazione per-anno: attiva = 1 se anno_archiviato IS NULL OR anno_archiviato > anno
      const baseSelect = `
        SELECT id, nome, tipo, gruppo_id, ordine, created_at, anno_archiviato,
          CASE WHEN anno_archiviato IS NULL OR anno_archiviato > ? THEN 1 ELSE 0 END AS attiva
        FROM patrimonio_voci
      `;
      if (soloAttive) {
        return db
          .prepare(`${baseSelect} WHERE (anno_archiviato IS NULL OR anno_archiviato > ?) ORDER BY tipo, ordine, nome`)
          .all(anno, anno) as PatrimonioVoce[];
      }
      return db
        .prepare(`${baseSelect} ORDER BY tipo, ordine, nome`)
        .all(anno) as PatrimonioVoce[];
    }
    // Fallback senza anno: usa il flag attiva globale (backward compat)
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

export function archiveVoce(db: Database.Database, id: number, anno: number): void {
  try {
    const info = db
      .prepare('UPDATE patrimonio_voci SET attiva = 0, anno_archiviato = ? WHERE id = ?')
      .run(anno, id);
    if (info.changes === 0) throw new Error(`Voce con id=${id} non trovata`);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to archive voce id=${id}: ${String(err)}`);
  }
}

export function restoreVoce(db: Database.Database, id: number): void {
  try {
    const info = db
      .prepare('UPDATE patrimonio_voci SET attiva = 1, anno_archiviato = NULL WHERE id = ?')
      .run(id);
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

function queryKpiTotals(db: Database.Database, anno: number): { totaleAttivi: number; totalePassivi: number } {
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

  return {
    totaleAttivi: rows.find((r) => r.tipo === 'attivo')?.totale ?? 0,
    totalePassivi: rows.find((r) => r.tipo === 'passivo')?.totale ?? 0,
  };
}

function hasDataForAnno(db: Database.Database, anno: number): boolean {
  const row = db
    .prepare('SELECT COUNT(*) as cnt FROM patrimonio_valori WHERE anno = ?')
    .get(anno) as { cnt: number };
  return row.cnt > 0;
}

function computeYoY(current: number, previous: number): { assoluto: number; percentuale: number } | null {
  if (previous === 0) return null;
  const assoluto = current - previous;
  const percentuale = (assoluto / Math.abs(previous)) * 100;
  return { assoluto, percentuale };
}

export function getKpiPatrimonio(db: Database.Database, anno: number): KpiPatrimonio {
  try {
    const { totaleAttivi, totalePassivi } = queryKpiTotals(db, anno);
    const patrimonioNetto = totaleAttivi - totalePassivi;

    const annoPrecedente = anno - 1;
    const hasPrevious = hasDataForAnno(db, annoPrecedente);

    if (!hasPrevious) {
      return {
        totaleAttivi,
        totalePassivi,
        patrimonioNetto,
        deltaAttiviYoY: null,
        deltaPassiviYoY: null,
        deltaNettoYoY: null,
      };
    }

    const prev = queryKpiTotals(db, annoPrecedente);
    const prevNetto = prev.totaleAttivi - prev.totalePassivi;

    return {
      totaleAttivi,
      totalePassivi,
      patrimonioNetto,
      deltaAttiviYoY: computeYoY(totaleAttivi, prev.totaleAttivi),
      deltaPassiviYoY: computeYoY(totalePassivi, prev.totalePassivi),
      deltaNettoYoY: computeYoY(patrimonioNetto, prevNetto),
    };
  } catch (err) {
    throw new Error(`Failed to get KPI patrimonio anno=${anno}: ${String(err)}`);
  }
}

export function getStorico(db: Database.Database): PatrimonioStorico {
  try {
    const rows = db
      .prepare(
        `SELECT pv.anno, pvc.tipo, SUM(pv.importo) as totale
         FROM patrimonio_valori pv
         JOIN patrimonio_voci pvc ON pvc.id = pv.voce_id
         WHERE pv.mese = 12
         GROUP BY pv.anno, pvc.tipo
         ORDER BY pv.anno`,
      )
      .all() as Array<{ anno: number; tipo: string; totale: number }>;

    const byAnno = new Map<number, { attivi: number; passivi: number }>();
    for (const row of rows) {
      if (!byAnno.has(row.anno)) byAnno.set(row.anno, { attivi: 0, passivi: 0 });
      const entry = byAnno.get(row.anno)!;
      if (row.tipo === 'attivo') entry.attivi = row.totale;
      else entry.passivi = row.totale;
    }

    const anniConValori = db
      .prepare('SELECT DISTINCT anno FROM patrimonio_valori ORDER BY anno')
      .all() as Array<{ anno: number }>;

    return anniConValori.map(({ anno }) => {
      const entry = byAnno.get(anno) ?? { attivi: 0, passivi: 0 };
      return {
        anno,
        totaleAttivi: entry.attivi,
        totalePassivi: entry.passivi,
        patrimonioNetto: entry.attivi - entry.passivi,
      };
    });
  } catch (err) {
    throw new Error(`Failed to get storico patrimonio: ${String(err)}`);
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
