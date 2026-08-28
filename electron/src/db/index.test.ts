import { afterEach, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { getDbPath, initDatabase } from './index';

const EXPECTED_TABLES = [
  'movimenti',
  'categorie',
  'metodi_pagamento',
  'dettagli',
  'impostazioni',
];

describe('getDbPath', () => {
  it('restituisce un path che termina con finance-journal.db', () => {
    const dbPath = getDbPath();
    expect(dbPath).toMatch(/finance-journal\.db$/);
  });

  it('su macOS punta a ~/Library/Application Support/finance-journal/', () => {
    if (process.platform !== 'darwin') return;
    const dbPath = getDbPath();
    const expected = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'finance-journal',
      'finance-journal.db',
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
      'finance-journal.db',
    );
    expect(dbPath).toBe(expected);
    if (saved !== undefined) process.env.XDG_DATA_HOME = saved;
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
