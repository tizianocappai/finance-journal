import { afterEach, describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { getDbPath, initDatabase, DB_FILENAME, LEGACY_DB_FILENAME } from './index';
import { updateMovimento } from '../ipc/movimenti';

const EXPECTED_TABLES = [
  'movimenti',
  'categorie',
  'metodi_pagamento',
  'dettagli',
  'impostazioni',
  'patrimonio_gruppi',
  'patrimonio_voci',
  'patrimonio_valori',
];

describe('getDbPath', () => {
  it(`restituisce un path che termina con ${DB_FILENAME}`, () => {
    const dbPath = getDbPath();
    expect(dbPath).toMatch(/finance\.db$/);
  });

  it('su macOS punta a ~/Library/Application Support/finance-journal/', () => {
    if (process.platform !== 'darwin') return;
    const dbPath = getDbPath();
    const expected = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'finance-journal',
      DB_FILENAME,
    );
    expect(dbPath).toBe(expected);
  });

  it('su Linux punta a ~/.local/share/finance-journal/ (senza XDG override)', () => {
    if (process.platform !== 'linux') return;
    const saved = process.env.XDG_DATA_HOME;
    delete process.env.XDG_DATA_HOME;
    const dbPath = getDbPath();
    const expected = path.join(
      os.homedir(),
      '.local',
      'share',
      'finance-journal',
      DB_FILENAME,
    );
    expect(dbPath).toBe(expected);
    if (saved !== undefined) process.env.XDG_DATA_HOME = saved;
  });

  it('su Windows punta a %LOCALAPPDATA%\\finance-journal\\finance-journal\\', () => {
    if (process.platform !== 'win32') return;
    const saved = process.env.LOCALAPPDATA;
    process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
    const dbPath = getDbPath();
    const expected = path.join(
      'C:\\Users\\test\\AppData\\Local',
      'finance-journal',
      'finance-journal',
      DB_FILENAME,
    );
    expect(dbPath).toBe(expected);
    if (saved !== undefined) process.env.LOCALAPPDATA = saved;
    else delete process.env.LOCALAPPDATA;
  });
});

describe('DB_FILENAME / LEGACY_DB_FILENAME', () => {
  it('DB_FILENAME corrisponde al file usato da Python', () => {
    expect(DB_FILENAME).toBe('finance.db');
  });

  it('LEGACY_DB_FILENAME è il vecchio nome Electron errato', () => {
    expect(LEGACY_DB_FILENAME).toBe('finance-journal.db');
  });
});

describe('initDatabase — warning DB legacy', () => {
  const tmpDir = path.join(os.tmpdir(), `fj-legacy-${process.pid}`);

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('emette warning se esiste finance-journal.db ma non finance.db', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const newPath = path.join(tmpDir, DB_FILENAME);
    const legacyPath = path.join(tmpDir, LEGACY_DB_FILENAME);
    fs.writeFileSync(legacyPath, '');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const db = initDatabase(newPath);
      db.close();
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0][0]).toContain(LEGACY_DB_FILENAME);
    } finally {
      warn.mockRestore();
    }
  });

  it('non emette warning se finance.db esiste già', () => {
    const newPath = path.join(tmpDir, DB_FILENAME);
    const db0 = initDatabase(newPath);
    db0.close();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const db = initDatabase(newPath);
      db.close();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('initDatabase — compatibilità DB Python', () => {
  const tmpDir = path.join(os.tmpdir(), `fj-compat-${process.pid}`);
  const dbPath = path.join(tmpDir, 'compat.db');

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ok */ }
  });

  it('non lancia FOREIGN KEY constraint failed su DB con schema Python e dettaglio_id non-null', () => {
    // Riproduce esattamente lo schema Python (user_version=0, dettagli come lookup,
    // movimenti con dettaglio_id NOT NULL). Prima del fix, migrateToV1 faceva DROP TABLE
    // dettagli rompendo le FK e lanciava "FOREIGN KEY constraint failed".
    fs.mkdirSync(tmpDir, { recursive: true });
    const Database = require('better-sqlite3');
    const seed = new Database(dbPath);
    seed.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE categorie (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        predefinita INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE metodi_pagamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        predefinito INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE dettagli (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        categoria_id INTEGER NOT NULL REFERENCES categorie(id),
        predefinita INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE movimenti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('entrata', 'uscita')),
        importo REAL NOT NULL CHECK(importo > 0),
        categoria_id INTEGER NOT NULL REFERENCES categorie(id),
        metodo_id INTEGER NOT NULL REFERENCES metodi_pagamento(id),
        nota TEXT NOT NULL DEFAULT '',
        sezione TEXT NOT NULL DEFAULT 'personale',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        dettaglio_id INTEGER REFERENCES dettagli(id)
      );
      CREATE TABLE impostazioni (chiave TEXT PRIMARY KEY, valore TEXT);
      INSERT INTO categorie (nome) VALUES ('Alimentari');
      INSERT INTO metodi_pagamento (nome) VALUES ('Contanti');
      INSERT INTO dettagli (nome, categoria_id) VALUES ('Spesa', 1);
      INSERT INTO movimenti (data, tipo, importo, categoria_id, metodo_id, dettaglio_id)
        VALUES ('2024-01-01', 'uscita', 50.0, 1, 1, 1);
    `);
    seed.close();

    expect(() => {
      const db = initDatabase(dbPath);
      db.close();
    }).not.toThrow();
  });

  it('migrateToV3: updateMovimento non lancia "no such column: updated_at" su DB Python senza quella colonna', () => {
    // Riproduce un DB Python con schema che non ha updated_at in movimenti.
    // Prima del fix, UPDATE ... SET updated_at = ... lanciava SqliteError.
    fs.mkdirSync(tmpDir, { recursive: true });
    const Database = require('better-sqlite3');
    const seed = new Database(dbPath);
    seed.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE categorie (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        predefinita INTEGER NOT NULL DEFAULT 0,
        colore TEXT,
        icona TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE metodi_pagamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        predefinito INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE dettagli (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        categoria_id INTEGER REFERENCES categorie(id),
        predefinito INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE movimenti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('entrata', 'uscita')),
        importo REAL NOT NULL,
        categoria_id INTEGER REFERENCES categorie(id),
        metodo_id INTEGER REFERENCES metodi_pagamento(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE impostazioni (chiave TEXT PRIMARY KEY, valore TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO categorie (nome) VALUES ('Alimentari');
      INSERT INTO metodi_pagamento (nome) VALUES ('Contanti');
      INSERT INTO movimenti (data, tipo, importo, categoria_id, metodo_id)
        VALUES ('2024-01-01', 'uscita', 50.0, 1, 1);
    `);
    seed.close();

    const db = initDatabase(dbPath);
    try {
      expect(() => {
        updateMovimento(db, 1, {
          data: '2024-06-15',
          importo: 50.0,
          tipo: 'uscita',
          categoria_id: 1,
          metodo_id: 1,
        });
      }).not.toThrow();
    } finally {
      db.close();
    }
  });
});

describe('initDatabase (smoke test)', () => {
  const tmpDir = path.join(os.tmpdir(), `fj-test-${process.pid}`);
  const testDbPath = path.join(tmpDir, 'test.db');

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('crea il DB e tutte le tabelle attese', () => {
    const db = initDatabase(testDbPath);

    try {
      const rows = db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
        )
        .all() as Array<{ name: string }>;

      const tableNames = rows.map((r) => r.name);

      for (const table of EXPECTED_TABLES) {
        expect(tableNames, `tabella mancante: ${table}`).toContain(table);
      }
    } finally {
      db.close();
    }
  });

  it('effettua il seed delle categorie di default', () => {
    const db = initDatabase(testDbPath);

    try {
      const count = (
        db.prepare('SELECT COUNT(*) as n FROM categorie').get() as { n: number }
      ).n;
      expect(count).toBeGreaterThan(0);
    } finally {
      db.close();
    }
  });

  it('effettua il seed dei metodi di pagamento di default', () => {
    const db = initDatabase(testDbPath);

    try {
      const count = (
        db.prepare('SELECT COUNT(*) as n FROM metodi_pagamento').get() as { n: number }
      ).n;
      expect(count).toBeGreaterThan(0);
    } finally {
      db.close();
    }
  });

  it('initDatabase è idempotente (doppia chiamata non lancia errori)', () => {
    const db1 = initDatabase(testDbPath);
    db1.close();

    expect(() => {
      const db2 = initDatabase(testDbPath);
      db2.close();
    }).not.toThrow();
  });
});
