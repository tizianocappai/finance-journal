import fs from 'node:fs';
import type Database from 'better-sqlite3';

export interface SkippedRow {
  row_num: number;
  raw: string;
  reason: string;
}

export interface NuovaEntita {
  categorie: string[];
  metodi: string[];
  dettagli: string[];
}

export interface PreviewResult {
  filePath: string;
  valide: number;
  saltate: SkippedRow[];
  nuove_entita: NuovaEntita;
}

export interface ExecuteResult {
  importati: number;
  saltati: SkippedRow[];
}

function detectDelimiter(line: string): string {
  const candidates = [',', ';', '\t', '|'];
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (!inQuotes && candidates.includes(ch)) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseLine(line: string, delim: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === delim && !inQuotes) {
      fields.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field.trim());
  return fields;
}

function parseDate(s: string): string | null {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return isValidYMD(Number(y), Number(m), Number(d)) ? `${y}-${m}-${d}` : null;
  }
  const dmy = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return isValidYMD(Number(y), Number(m), Number(d)) ? `${y}-${m}-${d}` : null;
  }
  return null;
}

function isValidYMD(y: number, m: number, d: number): boolean {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function parseImporto(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  if (isNaN(n) || n === 0) return null;
  return Math.abs(n);
}

function normalizeTipo(s: string): 'entrata' | 'uscita' | null {
  const lower = s.toLowerCase().trim();
  if (lower === 'entrata' || lower === 'in') return 'entrata';
  if (lower === 'uscita' || lower === 'out') return 'uscita';
  return null;
}

interface ColMap {
  data: number;
  tipo: number;
  importo: number;
  categoria: number;
  metodo: number;
  dettaglio: number;
  nota: number;
}

function buildColMap(headers: string[]): ColMap | null {
  const h = headers.map(s => s.toLowerCase().trim());
  const find = (...names: string[]): number => {
    for (const n of names) {
      const i = h.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };
  const data = find('data');
  const tipo = find('tipo');
  const importo = find('importo');
  if (data === -1 || tipo === -1 || importo === -1) return null;
  return {
    data,
    tipo,
    importo,
    categoria: find('categoria', 'categoria_nome'),
    metodo: find('metodo', 'metodo_nome', 'metodo_pagamento'),
    dettaglio: find('dettaglio', 'dettaglio_nome'),
    nota: find('nota', 'note', 'descrizione'),
  };
}

interface ParsedRow {
  data: string;
  tipo: 'entrata' | 'uscita';
  importo: number;
  categoria: string;
  metodo: string;
  dettaglio: string;
  nota: string;
}

interface ParseOutput {
  valid: { rowNum: number; row: ParsedRow }[];
  skipped: SkippedRow[];
}

function parseCsvContent(content: string): ParseOutput | null {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '');
  if (lines.length < 1) return { valid: [], skipped: [] };

  const delim = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delim);
  const colMap = buildColMap(headers);
  if (!colMap) return null;

  const valid: { rowNum: number; row: ParsedRow }[] = [];
  const skipped: SkippedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    const rowNum = i + 1;
    const fields = parseLine(raw, delim);

    const dateStr = (fields[colMap.data] ?? '').trim();
    const tipoStr = (fields[colMap.tipo] ?? '').trim();
    const importoStr = (fields[colMap.importo] ?? '').trim();

    const data = parseDate(dateStr);
    if (!data) {
      skipped.push({ row_num: rowNum, raw, reason: `Data non valida: "${dateStr}"` });
      continue;
    }

    const tipo = normalizeTipo(tipoStr);
    if (!tipo) {
      skipped.push({ row_num: rowNum, raw, reason: `Tipo non valido: "${tipoStr}"` });
      continue;
    }

    const importo = parseImporto(importoStr);
    if (importo === null) {
      skipped.push({ row_num: rowNum, raw, reason: `Importo non valido: "${importoStr}"` });
      continue;
    }

    valid.push({
      rowNum,
      row: {
        data,
        tipo,
        importo,
        categoria: colMap.categoria >= 0 ? (fields[colMap.categoria] ?? '').trim() : '',
        metodo: colMap.metodo >= 0 ? (fields[colMap.metodo] ?? '').trim() : '',
        dettaglio: colMap.dettaglio >= 0 ? (fields[colMap.dettaglio] ?? '').trim() : '',
        nota: colMap.nota >= 0 ? (fields[colMap.nota] ?? '').trim() : '',
      },
    });
  }

  return { valid, skipped };
}

function getNuoveEntita(db: Database.Database, rows: ParsedRow[]): NuovaEntita {
  const existingCategorie = new Set(
    (db.prepare('SELECT nome FROM categorie').all() as { nome: string }[]).map(r => r.nome),
  );
  const existingMetodi = new Set(
    (db.prepare('SELECT nome FROM metodi_pagamento').all() as { nome: string }[]).map(r => r.nome),
  );
  const existingDettagli = new Set(
    (db.prepare('SELECT nome FROM dettagli').all() as { nome: string }[]).map(r => r.nome),
  );

  const nuoveCategorie = new Set<string>();
  const nuoviMetodi = new Set<string>();
  const nuoviDettagli = new Set<string>();

  for (const row of rows) {
    if (row.categoria && !existingCategorie.has(row.categoria)) nuoveCategorie.add(row.categoria);
    if (row.metodo && !existingMetodi.has(row.metodo)) nuoviMetodi.add(row.metodo);
    if (row.dettaglio && !existingDettagli.has(row.dettaglio)) nuoviDettagli.add(row.dettaglio);
  }

  return {
    categorie: [...nuoveCategorie].sort(),
    metodi: [...nuoviMetodi].sort(),
    dettagli: [...nuoviDettagli].sort(),
  };
}

export function previewCsv(db: Database.Database, filePath: string): PreviewResult {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseCsvContent(content);
    if (!parsed) {
      throw new Error('Intestazione CSV non valida: colonne richieste (Data, Tipo, Importo) non trovate');
    }
    return {
      filePath,
      valide: parsed.valid.length,
      saltate: parsed.skipped,
      nuove_entita: getNuoveEntita(db, parsed.valid.map(r => r.row)),
    };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Errore analisi CSV: ${String(err)}`);
  }
}

export function executeCsv(db: Database.Database, filePath: string): ExecuteResult {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseCsvContent(content);
    if (!parsed) {
      throw new Error('Intestazione CSV non valida: colonne richieste (Data, Tipo, Importo) non trovate');
    }

    const importati = db.transaction(() => {
      const insertCategoria = db.prepare(`INSERT OR IGNORE INTO categorie (nome) VALUES (?)`);
      const getCategoriaId = db.prepare(`SELECT id FROM categorie WHERE nome = ?`);
      const insertMetodo = db.prepare(`INSERT OR IGNORE INTO metodi_pagamento (nome) VALUES (?)`);
      const getMetodoId = db.prepare(`SELECT id FROM metodi_pagamento WHERE nome = ?`);
      const insertDettaglio = db.prepare(`INSERT OR IGNORE INTO dettagli (nome) VALUES (?)`);
      const getDettaglioId = db.prepare(`SELECT id FROM dettagli WHERE nome = ?`);
      const insertMovimento = db.prepare(
        `INSERT INTO movimenti (data, importo, tipo, descrizione, categoria_id, metodo_id, dettaglio_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );

      let count = 0;
      for (const { row } of parsed.valid) {
        let categoria_id: number | null = null;
        if (row.categoria) {
          insertCategoria.run(row.categoria);
          categoria_id = (getCategoriaId.get(row.categoria) as { id: number }).id;
        }

        let metodo_id: number | null = null;
        if (row.metodo) {
          insertMetodo.run(row.metodo);
          metodo_id = (getMetodoId.get(row.metodo) as { id: number }).id;
        }

        let dettaglio_id: number | null = null;
        if (row.dettaglio) {
          insertDettaglio.run(row.dettaglio);
          dettaglio_id = (getDettaglioId.get(row.dettaglio) as { id: number }).id;
        }

        insertMovimento.run(
          row.data,
          row.importo,
          row.tipo,
          row.nota || null,
          categoria_id,
          metodo_id,
          dettaglio_id,
        );
        count++;
      }
      return count;
    })();

    return { importati, saltati: parsed.skipped };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Errore esecuzione import CSV: ${String(err)}`);
  }
}
