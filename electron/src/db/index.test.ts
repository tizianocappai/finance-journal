import { afterEach, describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { getDbPath, initDatabase, DB_FILENAME, LEGACY_DB_FILENAME } from './index';

const EXPECTED_TABLES = [
  'movimenti',
  'categorie',
  'metodi_pagamento',
  'dettagli',
  'impostazioni',
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
