import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { initDatabase } from '../db/index';
import { previewCsv, executeCsv } from './import_csv';

let db: Database.Database;
let tmpDir: string;

beforeEach(() => {
  db = initDatabase(':memory:');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fin-journal-csv-test-'));
});

afterEach(() => {
  try { db.close(); } catch { /* already closed */ }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeCsv(filename: string, lines: string[]): string {
  const p = path.join(tmpDir, filename);
  fs.writeFileSync(p, lines.join('\n'), 'utf-8');
  return p;
}

describe('previewCsv', () => {
  it('CSV valido → conta righe valide', () => {
    const p = writeCsv('valid.csv', [
      'Data,Tipo,Importo,Categoria,Metodo,Dettaglio,Nota',
      '2024-01-10,entrata,1000,Stipendio,Bonifico,,',
      '2024-02-05,uscita,30,Alimentari,Contanti,,Spesa',
    ]);
    const result = previewCsv(db, p);
    expect(result.valide).toBe(2);
    expect(result.saltate).toHaveLength(0);
  });

  it('riga con data invalida → saltata con motivo', () => {
    const p = writeCsv('invalid_date.csv', [
      'Data,Tipo,Importo',
      '99-99-9999,uscita,50',
      '2024-01-10,entrata,100',
    ]);
    const result = previewCsv(db, p);
    expect(result.valide).toBe(1);
    expect(result.saltate).toHaveLength(1);
    expect(result.saltate[0].reason).toContain('Data non valida');
  });

  it('delimitatore semicolon → parsing corretto', () => {
    const p = writeCsv('semicolon.csv', [
      'Data;Tipo;Importo;Nota',
      '2024-03-01;uscita;45;Pranzo',
    ]);
    const result = previewCsv(db, p);
    expect(result.valide).toBe(1);
    expect(result.saltate).toHaveLength(0);
  });

  it('delimitatore tab → parsing corretto', () => {
    const p = writeCsv('tab.csv', [
      'Data\tTipo\tImporto',
      '2024-03-01\tuscita\t45',
    ]);
    const result = previewCsv(db, p);
    expect(result.valide).toBe(1);
  });

  it('delimitatore pipe → parsing corretto', () => {
    const p = writeCsv('pipe.csv', [
      'Data|Tipo|Importo',
      '2024-03-01|uscita|45',
    ]);
    const result = previewCsv(db, p);
    expect(result.valide).toBe(1);
  });

  it('Categoria nuova → segnalata in nuove_entita', () => {
    const p = writeCsv('new_cat.csv', [
      'Data,Tipo,Importo,Categoria',
      '2024-01-01,entrata,500,FreelanceNuova',
    ]);
    const result = previewCsv(db, p);
    expect(result.nuove_entita.categorie).toContain('FreelanceNuova');
  });

  it('Metodo nuovo → segnalato in nuove_entita', () => {
    const p = writeCsv('new_metodo.csv', [
      'Data,Tipo,Importo,Metodo',
      '2024-01-01,entrata,500,CryptoWallet',
    ]);
    const result = previewCsv(db, p);
    expect(result.nuove_entita.metodi).toContain('CryptoWallet');
  });

  it('Dettaglio nuovo → segnalato in nuove_entita', () => {
    const p = writeCsv('new_dettaglio.csv', [
      'Data,Tipo,Importo,Dettaglio',
      '2024-01-01,entrata,500,DettaglioNuovo',
    ]);
    const result = previewCsv(db, p);
    expect(result.nuove_entita.dettagli).toContain('DettaglioNuovo');
  });

  it('formato data DD/MM/YYYY → accettato', () => {
    const p = writeCsv('dmy_slash.csv', [
      'Data,Tipo,Importo',
      '15/06/2023,uscita,120',
    ]);
    const result = previewCsv(db, p);
    expect(result.valide).toBe(1);
  });

  it('formato data DD-MM-YYYY → accettato', () => {
    const p = writeCsv('dmy_dash.csv', [
      'Data,Tipo,Importo',
      '15-06-2023,uscita,120',
    ]);
    const result = previewCsv(db, p);
    expect(result.valide).toBe(1);
  });

  it('tipo invalido → saltato', () => {
    const p = writeCsv('bad_tipo.csv', [
      'Data,Tipo,Importo',
      '2024-01-01,trasferimento,100',
    ]);
    const result = previewCsv(db, p);
    expect(result.saltate).toHaveLength(1);
    expect(result.saltate[0].reason).toContain('Tipo non valido');
  });

  it('importo invalido → saltato', () => {
    const p = writeCsv('bad_importo.csv', [
      'Data,Tipo,Importo',
      '2024-01-01,uscita,abc',
    ]);
    const result = previewCsv(db, p);
    expect(result.saltate).toHaveLength(1);
    expect(result.saltate[0].reason).toContain('Importo non valido');
  });

  it('intestazione mancante di colonne richieste → lancia errore', () => {
    const p = writeCsv('bad_headers.csv', [
      'Colonna1,Colonna2',
      'a,b',
    ]);
    expect(() => previewCsv(db, p)).toThrow();
  });

  it('filePath incluso nel risultato', () => {
    const p = writeCsv('path.csv', [
      'Data,Tipo,Importo',
      '2024-01-01,entrata,100',
    ]);
    const result = previewCsv(db, p);
    expect(result.filePath).toBe(p);
  });
});

describe('executeCsv', () => {
  it('CSV valido → tutti movimenti importati nel DB', () => {
    const p = writeCsv('exec.csv', [
      'Data,Tipo,Importo,Categoria,Metodo,Dettaglio,Nota',
      '2024-01-10,entrata,1000,Stipendio,Bonifico,,',
      '2024-02-05,uscita,30,Alimentari,Contanti,,Spesa',
    ]);
    const result = executeCsv(db, p);
    expect(result.importati).toBe(2);
    expect(result.saltati).toHaveLength(0);
    const rows = db.prepare('SELECT * FROM movimenti').all();
    expect(rows).toHaveLength(2);
  });

  it('Categoria nuova → auto-creata nel DB', () => {
    const p = writeCsv('autocreate_cat.csv', [
      'Data,Tipo,Importo,Categoria',
      '2024-01-01,entrata,500,Freelance2024',
    ]);
    executeCsv(db, p);
    const cat = db.prepare("SELECT * FROM categorie WHERE nome = 'Freelance2024'").get();
    expect(cat).toBeTruthy();
  });

  it('Metodo nuovo → auto-creato nel DB', () => {
    const p = writeCsv('autocreate_metodo.csv', [
      'Data,Tipo,Importo,Metodo',
      '2024-01-01,entrata,500,Monero',
    ]);
    executeCsv(db, p);
    const m = db.prepare("SELECT * FROM metodi_pagamento WHERE nome = 'Monero'").get();
    expect(m).toBeTruthy();
  });

  it('Dettaglio nuovo → auto-creato nel DB', () => {
    const p = writeCsv('autocreate_det.csv', [
      'Data,Tipo,Importo,Dettaglio',
      '2024-01-01,entrata,500,SubDettaglio',
    ]);
    executeCsv(db, p);
    const d = db.prepare("SELECT * FROM dettagli WHERE nome = 'SubDettaglio'").get();
    expect(d).toBeTruthy();
  });

  it('riga duplicata stessa data/importo → importata (no deduplicazione)', () => {
    const p = writeCsv('dup.csv', [
      'Data,Tipo,Importo',
      '2024-01-10,uscita,50',
      '2024-01-10,uscita,50',
    ]);
    const result = executeCsv(db, p);
    expect(result.importati).toBe(2);
    const rows = db.prepare('SELECT * FROM movimenti').all();
    expect(rows).toHaveLength(2);
  });

  it('riga con importo invalido → saltata, resto importato', () => {
    const p = writeCsv('invalid_importo.csv', [
      'Data,Tipo,Importo',
      '2024-01-01,uscita,abc',
      '2024-01-02,entrata,100',
    ]);
    const result = executeCsv(db, p);
    expect(result.importati).toBe(1);
    expect(result.saltati).toHaveLength(1);
  });

  it('formato Electron export → importato correttamente', () => {
    const p = writeCsv('electron_export.csv', [
      'id,data,importo,tipo,descrizione,categoria_nome,metodo_nome,dettaglio_nome,sezione,created_at,updated_at',
      '1,2024-05-01,200,entrata,Stipendio,Stipendio,Bonifico,,,2024-05-01,2024-05-01',
    ]);
    const result = executeCsv(db, p);
    expect(result.importati).toBe(1);
    const rows = db.prepare('SELECT * FROM movimenti').all() as { importo: number }[];
    expect(rows[0].importo).toBe(200);
  });

  it('importo con virgola decimale → importato correttamente', () => {
    const p = writeCsv('comma_decimal.csv', [
      'Data;Tipo;Importo',
      '2024-01-01;uscita;12,50',
    ]);
    const result = executeCsv(db, p);
    expect(result.importati).toBe(1);
    const rows = db.prepare('SELECT importo FROM movimenti').all() as { importo: number }[];
    expect(rows[0].importo).toBeCloseTo(12.5);
  });

  it('importo negativo (export da altri tool) → importato come valore assoluto', () => {
    const p = writeCsv('negative_importo.csv', [
      'Data,Tipo,Importo',
      '2024-01-01,uscita,-50.00',
    ]);
    const result = executeCsv(db, p);
    expect(result.importati).toBe(1);
    const rows = db.prepare('SELECT importo FROM movimenti').all() as { importo: number }[];
    expect(rows[0].importo).toBeCloseTo(50);
  });

  it('nota → salvata come descrizione nel movimento', () => {
    const p = writeCsv('nota.csv', [
      'Data,Tipo,Importo,Nota',
      '2024-01-01,uscita,50,Cena con amici',
    ]);
    executeCsv(db, p);
    const row = db.prepare('SELECT descrizione FROM movimenti').get() as { descrizione: string };
    expect(row.descrizione).toBe('Cena con amici');
  });
});
