import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import type Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDatabase } from '../db/index';
import { createMovimento } from './movimenti';
import { exportCsv, exportJson, importDb } from './export_import';

let db: Database.Database;
let tmpDir: string;

beforeEach(() => {
  db = initDatabase(':memory:');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fin-journal-test-'));
});

afterEach(() => {
  try { db.close(); } catch { /* already closed */ }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('exportCsv', () => {
  it('scrive header con colonna sezione', () => {
    const outPath = path.join(tmpDir, 'out.csv');
    exportCsv(db, outPath);
    const [header] = fs.readFileSync(outPath, 'utf-8').split('\n');
    expect(header).toContain('sezione');
  });

  it('header completo, nessuna riga se nessun movimento', () => {
    const outPath = path.join(tmpDir, 'out.csv');
    exportCsv(db, outPath);
    const lines = fs.readFileSync(outPath, 'utf-8').split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      'id,data,importo,tipo,descrizione,categoria_nome,metodo_nome,dettaglio_nome,sezione,created_at,updated_at',
    );
  });

  it('include una riga per ogni movimento', () => {
    createMovimento(db, { data: '2024-01-10', importo: 100, tipo: 'entrata', descrizione: 'Stipendio' });
    createMovimento(db, { data: '2024-02-05', importo: 30, tipo: 'uscita', descrizione: 'Spesa' });
    const outPath = path.join(tmpDir, 'out.csv');
    exportCsv(db, outPath);
    const lines = fs.readFileSync(outPath, 'utf-8').split('\n');
    expect(lines).toHaveLength(3); // header + 2 righe
  });

  it('valori con virgola vengono quotati', () => {
    createMovimento(db, { data: '2024-01-10', importo: 50, tipo: 'uscita', descrizione: 'Spesa, supermercato' });
    const outPath = path.join(tmpDir, 'out.csv');
    exportCsv(db, outPath);
    const content = fs.readFileSync(outPath, 'utf-8');
    expect(content).toContain('"Spesa, supermercato"');
  });
});

describe('exportJson', () => {
  it('struttura full con tutte le entità lookup', () => {
    const outPath = path.join(tmpDir, 'out.json');
    exportJson(db, outPath);
    const payload = JSON.parse(fs.readFileSync(outPath, 'utf-8')) as Record<string, unknown>;
    expect(payload).toHaveProperty('movimenti');
    expect(payload).toHaveProperty('categorie');
    expect(payload).toHaveProperty('dettagli');
    expect(payload).toHaveProperty('metodi_pagamento');
  });

  it('movimenti contiene i dati corretti', () => {
    createMovimento(db, { data: '2024-01-10', importo: 100, tipo: 'entrata', descrizione: 'Test' });
    const outPath = path.join(tmpDir, 'out.json');
    exportJson(db, outPath);
    const { movimenti } = JSON.parse(fs.readFileSync(outPath, 'utf-8')) as { movimenti: Record<string, unknown>[] };
    expect(movimenti).toHaveLength(1);
    expect(movimenti[0]).toMatchObject({ data: '2024-01-10', importo: 100, tipo: 'entrata', descrizione: 'Test' });
  });

  it('categorie e metodi_pagamento includono i default', () => {
    const outPath = path.join(tmpDir, 'out.json');
    exportJson(db, outPath);
    const { categorie, metodi_pagamento } = JSON.parse(fs.readFileSync(outPath, 'utf-8')) as {
      categorie: unknown[];
      metodi_pagamento: unknown[];
    };
    expect(categorie.length).toBeGreaterThan(0);
    expect(metodi_pagamento.length).toBeGreaterThan(0);
  });
});

describe('importDb', () => {
  function makeValidDb(dbPath: string): void {
    const d = new BetterSqlite3(dbPath);
    d.exec(`
      CREATE TABLE movimenti (id INTEGER PRIMARY KEY);
      CREATE TABLE categorie (id INTEGER PRIMARY KEY);
      CREATE TABLE metodi_pagamento (id INTEGER PRIMARY KEY);
    `);
    d.close();
  }

  function makeCurrentDb(dbPath: string): void {
    const d = new BetterSqlite3(dbPath);
    d.exec(`CREATE TABLE original (id INTEGER PRIMARY KEY)`);
    d.close();
  }

  it('con file valido: backup creato, DB sostituito', () => {
    const currentPath = path.join(tmpDir, 'current.db');
    const importPath = path.join(tmpDir, 'import.db');
    const backupDir = path.join(tmpDir, 'backup');

    makeCurrentDb(currentPath);
    makeValidDb(importPath);

    importDb(db, currentPath, importPath, backupDir);

    const backupFiles = fs.readdirSync(backupDir);
    expect(backupFiles.length).toBe(1);
    expect(backupFiles[0]).toMatch(/^nobudget-backup-/);

    const replaced = new BetterSqlite3(currentPath, { readonly: true });
    try {
      const tables = (
        replaced.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as { name: string }[]
      ).map(t => t.name);
      expect(tables).toContain('movimenti');
      expect(tables).not.toContain('original');
    } finally {
      replaced.close();
    }
  });

  it('con file non SQLite: lancia errore INVALID_DB, DB corrente intatto', () => {
    const currentPath = path.join(tmpDir, 'current.db');
    const importPath = path.join(tmpDir, 'notadb.db');
    const backupDir = path.join(tmpDir, 'backup');

    makeCurrentDb(currentPath);
    fs.writeFileSync(importPath, 'questo non è un database sqlite', 'utf-8');

    expect(() => importDb(db, currentPath, importPath, backupDir)).toThrow();

    const intact = new BetterSqlite3(currentPath, { readonly: true });
    try {
      const tables = (
        intact.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as { name: string }[]
      ).map(t => t.name);
      expect(tables).toContain('original');
    } finally {
      intact.close();
    }

    expect(fs.existsSync(backupDir)).toBe(false);
  });

  it('con SQLite senza tabelle attese: lancia errore, DB corrente intatto', () => {
    const currentPath = path.join(tmpDir, 'current.db');
    const importPath = path.join(tmpDir, 'incomplete.db');
    const backupDir = path.join(tmpDir, 'backup');

    makeCurrentDb(currentPath);
    const incomplete = new BetterSqlite3(importPath);
    incomplete.exec(`CREATE TABLE foo (id INTEGER PRIMARY KEY)`);
    incomplete.close();

    expect(() => importDb(db, currentPath, importPath, backupDir)).toThrow(/tabelle mancanti|INVALID_DB/i);

    const intact = new BetterSqlite3(currentPath, { readonly: true });
    try {
      const tables = (
        intact.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as { name: string }[]
      ).map(t => t.name);
      expect(tables).toContain('original');
    } finally {
      intact.close();
    }

    expect(fs.existsSync(backupDir)).toBe(false);
  });
});
