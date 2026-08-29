import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Categoria, Dettaglio, MetodoPagamento } from './types';

interface MovimentoCsvRow {
  id: number;
  data: string;
  importo: number;
  tipo: string;
  descrizione: string | null;
  categoria_nome: string | null;
  metodo_nome: string | null;
  dettaglio_nome: string | null;
  sezione: string;
  created_at: string;
  updated_at: string;
}

const CSV_HEADERS: (keyof MovimentoCsvRow)[] = [
  'id', 'data', 'importo', 'tipo', 'descrizione',
  'categoria_nome', 'metodo_nome', 'dettaglio_nome',
  'sezione', 'created_at', 'updated_at',
];

function csvEscape(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCsv(db: Database.Database, filePath: string): void {
  try {
    const rows = db.prepare(`
      SELECT
        m.id, m.data, m.importo, m.tipo, m.descrizione,
        c.nome  AS categoria_nome,
        mp.nome AS metodo_nome,
        d.nome  AS dettaglio_nome,
        ''      AS sezione,
        m.created_at, m.updated_at
      FROM movimenti m
      LEFT JOIN categorie c ON c.id = m.categoria_id
      LEFT JOIN metodi_pagamento mp ON mp.id = m.metodo_id
      LEFT JOIN dettagli d ON d.id = m.dettaglio_id
      ORDER BY m.data DESC, m.id DESC
    `).all() as MovimentoCsvRow[];

    const lines = [
      CSV_HEADERS.join(','),
      ...rows.map(r =>
        CSV_HEADERS.map(h => csvEscape(r[h] as string | number | null)).join(','),
      ),
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  } catch (err) {
    throw new Error(`Failed to export CSV: ${String(err)}`);
  }
}

export function exportJson(db: Database.Database, filePath: string): void {
  try {
    const movimenti = db.prepare(
      `SELECT * FROM movimenti ORDER BY data DESC, id DESC`,
    ).all();
    const categorie = db.prepare(
      `SELECT * FROM categorie ORDER BY nome`,
    ).all() as Categoria[];
    const dettagli = db.prepare(
      `SELECT * FROM dettagli ORDER BY nome`,
    ).all() as Dettaglio[];
    const metodi_pagamento = db.prepare(
      `SELECT * FROM metodi_pagamento ORDER BY nome`,
    ).all() as MetodoPagamento[];

    const payload = { movimenti, categorie, dettagli, metodi_pagamento };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    throw new Error(`Failed to export JSON: ${String(err)}`);
  }
}

const REQUIRED_TABLES = ['movimenti', 'categorie', 'metodi_pagamento'];

export function importDb(
  db: Database.Database,
  currentDbPath: string,
  importDbPath: string,
  backupDir: string,
): void {
  // Validate while db is still open — throws before closing if invalid
  let conn: Database.Database;
  try {
    conn = new Database(importDbPath, { readonly: true });
  } catch {
    throw Object.assign(
      new Error('File non è un database SQLite valido'),
      { code: 'INVALID_DB' },
    );
  }

  try {
    const tables = (
      conn.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as { name: string }[]
    ).map(t => t.name);

    const missing = REQUIRED_TABLES.filter(t => !tables.includes(t));
    if (missing.length > 0) {
      throw Object.assign(
        new Error(`Database non valido: tabelle mancanti (${missing.join(', ')})`),
        { code: 'INVALID_DB' },
      );
    }
  } finally {
    conn.close();
  }

  // Close current db only after validation passes
  try { db.pragma('wal_checkpoint(FULL)'); } catch { /* ignore on :memory: */ }
  db.close();

  try {
    fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `nobudget-backup-${ts}.db`);
    fs.copyFileSync(currentDbPath, backupPath);
  } catch (err) {
    throw new Error(`Failed to backup database: ${String(err)}`);
  }

  try {
    fs.copyFileSync(importDbPath, currentDbPath);
  } catch (err) {
    throw new Error(`Failed to replace database: ${String(err)}`);
  }
}
