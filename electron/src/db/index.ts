import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function getDbPath(): string {
  const appName = 'finance-journal';

  let baseDir: string;

  try {
    if (process.platform === 'darwin') {
      baseDir = path.join(os.homedir(), 'Library', 'Application Support', appName);
    } else if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
      baseDir = path.join(localAppData, appName, appName);
    } else {
      // Linux + altri Unix
      const xdgData = process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local', 'share');
      baseDir = path.join(xdgData, appName);
    }
  } catch (err) {
    throw new Error(`Failed to resolve DB base path: ${String(err)}`);
  }

  return path.join(baseDir, `${appName}.db`);
}

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categorie (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT    NOT NULL UNIQUE,
  colore     TEXT,
  icona      TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS metodi_pagamento (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS movimenti (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  data         TEXT    NOT NULL,
  importo      REAL    NOT NULL,
  tipo         TEXT    NOT NULL CHECK (tipo IN ('entrata', 'uscita')),
  descrizione  TEXT,
  categoria_id INTEGER REFERENCES categorie(id) ON DELETE SET NULL,
  metodo_id    INTEGER REFERENCES metodi_pagamento(id) ON DELETE SET NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dettagli (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  movimento_id INTEGER NOT NULL REFERENCES movimenti(id) ON DELETE CASCADE,
  chiave       TEXT    NOT NULL,
  valore       TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS impostazioni (
  chiave     TEXT PRIMARY KEY,
  valore     TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const DEFAULT_CATEGORIE = [
  'Alimentari',
  'Trasporti',
  'Salute',
  'Casa',
  'Intrattenimento',
  'Abbigliamento',
  'Istruzione',
  'Tecnologia',
  'Sport',
  'Viaggi',
  'Ristorante',
  'Utenze',
  'Stipendio',
  'Investimenti',
  'Altro',
];

const DEFAULT_METODI = [
  'Contanti',
  'Carta di credito',
  'Carta di debito',
  'Bonifico',
  'PayPal',
  'Satispay',
];

export function seedDefaults(db: Database.Database): void {
  try {
    const insertCategoria = db.prepare(
      `INSERT OR IGNORE INTO categorie (nome) VALUES (?)`,
    );
    const insertMetodo = db.prepare(
      `INSERT OR IGNORE INTO metodi_pagamento (nome) VALUES (?)`,
    );

    const seedAll = db.transaction(() => {
      for (const nome of DEFAULT_CATEGORIE) {
        insertCategoria.run(nome);
      }
      for (const nome of DEFAULT_METODI) {
        insertMetodo.run(nome);
      }
    });

    seedAll();
  } catch (err) {
    throw new Error(`Failed to seed default values: ${String(err)}`);
  }
}

export function initDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? getDbPath();

  try {
    const dir = path.dirname(resolvedPath);
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to create DB directory: ${String(err)}`);
  }

  let db: Database.Database;

  try {
    db = new Database(resolvedPath);
  } catch (err) {
    throw new Error(`Failed to open database at ${resolvedPath}: ${String(err)}`);
  }

  try {
    db.exec(SCHEMA_SQL);
  } catch (err) {
    db.close();
    throw new Error(`Failed to initialize schema: ${String(err)}`);
  }

  seedDefaults(db);

  return db;
}
