import type Database from 'better-sqlite3';
import type { DashboardKPI, SerieMensile, BreakdownCategoria, TrendYoY, RiepilogoMensile, RiepilogoMensileResult } from './types';
import { getSaldoIniziale } from './impostazioni';

const NOMI_MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export function getDashboardKPI(db: Database.Database, anno: number): DashboardKPI {
  try {
    const annoPad = String(anno);

    const row = db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN tipo='entrata' THEN importo ELSE 0 END), 0) AS entrate,
          COALESCE(SUM(CASE WHEN tipo='uscita'  THEN importo ELSE 0 END), 0) AS uscite
        FROM movimenti
        WHERE strftime('%Y', data) = ?`,
      )
      .get(annoPad) as { entrate: number; uscite: number };

    const { cnt } = db
      .prepare(
        `WITH monthly AS (
          SELECT
            SUM(CASE WHEN tipo='entrata' THEN importo ELSE 0 END) -
            SUM(CASE WHEN tipo='uscita'  THEN importo ELSE 0 END) AS saldo_mese
          FROM movimenti
          WHERE strftime('%Y', data) = ?
          GROUP BY strftime('%m', data)
        )
        SELECT COUNT(*) AS cnt FROM monthly WHERE saldo_mese < 0`,
      )
      .get(annoPad) as { cnt: number };

    const saldoIniziale = getSaldoIniziale(db, anno);

    return {
      entrate: row.entrate,
      uscite: row.uscite,
      saldo: row.entrate - row.uscite + saldoIniziale,
      mesi_in_rosso: cnt,
    };
  } catch (err) {
    throw new Error(`Failed to get dashboard KPI: ${String(err)}`);
  }
}

export function getSerieMensili(db: Database.Database, anno: number): SerieMensile[] {
  try {
    const hasMovimenti = (db
      .prepare(`SELECT 1 FROM movimenti WHERE strftime('%Y', data) = ? LIMIT 1`)
      .get(String(anno))) != null;

    if (!hasMovimenti) return [];

    const rows = db
      .prepare(
        `WITH mesi(mese) AS (
          VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12)
        )
        SELECT
          m.mese,
          COALESCE(SUM(CASE WHEN mv.tipo='entrata' THEN mv.importo ELSE 0 END), 0) AS entrate,
          COALESCE(SUM(CASE WHEN mv.tipo='uscita'  THEN mv.importo ELSE 0 END), 0) AS uscite
        FROM mesi m
        LEFT JOIN movimenti mv
          ON CAST(strftime('%m', mv.data) AS INTEGER) = m.mese
          AND strftime('%Y', mv.data) = ?
        GROUP BY m.mese
        ORDER BY m.mese`,
      )
      .all(String(anno)) as { mese: number; entrate: number; uscite: number }[];

    return rows.map((r) => ({
      mese: r.mese,
      nome_mese: NOMI_MESI[r.mese - 1],
      entrate: r.entrate,
      uscite: r.uscite,
    }));
  } catch (err) {
    throw new Error(`Failed to get serie mensili: ${String(err)}`);
  }
}

export function getBreakdownCategorie(db: Database.Database, anno: number): BreakdownCategoria[] {
  try {
    return db
      .prepare(
        `SELECT
          m.categoria_id,
          COALESCE(c.nome, 'Senza categoria') AS categoria_nome,
          SUM(m.importo) AS totale
        FROM movimenti m
        LEFT JOIN categorie c ON c.id = m.categoria_id
        WHERE strftime('%Y', m.data) = ? AND m.tipo = 'uscita'
        GROUP BY m.categoria_id, c.nome
        ORDER BY totale DESC`,
      )
      .all(String(anno)) as BreakdownCategoria[];
  } catch (err) {
    throw new Error(`Failed to get breakdown categorie: ${String(err)}`);
  }
}

function mediana(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function getRiepilogoMensile(db: Database.Database, anno: number): RiepilogoMensileResult {
  try {
    const rows = db
      .prepare(
        `WITH mesi(mese) AS (
          VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12)
        )
        SELECT
          m.mese,
          COALESCE(SUM(CASE WHEN mv.tipo='entrata' THEN mv.importo ELSE 0 END), 0) AS entrate,
          COALESCE(SUM(CASE WHEN mv.tipo='uscita'  THEN mv.importo ELSE 0 END), 0) AS uscite
        FROM mesi m
        LEFT JOIN movimenti mv
          ON CAST(strftime('%m', mv.data) AS INTEGER) = m.mese
          AND strftime('%Y', mv.data) = ?
        GROUP BY m.mese
        ORDER BY m.mese`,
      )
      .all(String(anno)) as { mese: number; entrate: number; uscite: number }[];

    const saldos = rows.map((r) => r.entrate - r.uscite);

    const righe: RiepilogoMensile[] = rows.map((r, i) => ({
      mese: r.mese,
      nome_mese: NOMI_MESI[r.mese - 1],
      entrate: r.entrate,
      uscite: r.uscite,
      saldo: saldos[i],
      delta: i > 0 ? saldos[i] - saldos[i - 1] : null,
    }));

    const totale = righe.reduce(
      (acc, r) => ({ entrate: acc.entrate + r.entrate, uscite: acc.uscite + r.uscite, saldo: acc.saldo + r.saldo }),
      { entrate: 0, uscite: 0, saldo: 0 },
    );

    const media = {
      entrate: totale.entrate / 12,
      uscite: totale.uscite / 12,
      saldo: totale.saldo / 12,
    };

    const medianaVal = {
      entrate: mediana(righe.map((r) => r.entrate)),
      uscite: mediana(righe.map((r) => r.uscite)),
      saldo: mediana(righe.map((r) => r.saldo)),
    };

    return { righe, totale, media, mediana: medianaVal };
  } catch (err) {
    throw new Error('Failed to get riepilogo mensile', { cause: err });
  }
}

function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export function getTrendYoY(db: Database.Database, anno: number): TrendYoY {
  try {
    const curr = getDashboardKPI(db, anno);
    const prev = getDashboardKPI(db, anno - 1);

    const deltaMesiInRosso =
      prev.mesi_in_rosso === 0 && curr.mesi_in_rosso === 0
        ? null
        : curr.mesi_in_rosso - prev.mesi_in_rosso;

    return {
      entrate_anno_corrente: curr.entrate,
      entrate_anno_precedente: prev.entrate,
      uscite_anno_corrente: curr.uscite,
      uscite_anno_precedente: prev.uscite,
      saldo_anno_corrente: curr.saldo,
      saldo_anno_precedente: prev.saldo,
      mesi_in_rosso_anno_corrente: curr.mesi_in_rosso,
      mesi_in_rosso_anno_precedente: prev.mesi_in_rosso,
      delta_entrate_pct: deltaPct(curr.entrate, prev.entrate),
      delta_uscite_pct: deltaPct(curr.uscite, prev.uscite),
      delta_saldo_pct: deltaPct(curr.saldo, prev.saldo),
      delta_mesi_in_rosso: deltaMesiInRosso,
    };
  } catch (err) {
    throw new Error(`Failed to get trend YoY: ${String(err)}`);
  }
}
