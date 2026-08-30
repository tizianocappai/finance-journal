import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_NAME = 'finance-journal';
export const DB_FILENAME = 'finance.db';
export const LEGACY_DB_FILENAME = 'finance-journal.db';

export function getDbPath(): string {
  let baseDir: string;

  try {
    if (process.platform === 'darwin') {
      baseDir = path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
    } else if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
      baseDir = path.join(localAppData, APP_NAME, APP_NAME);
    } else {
      const xdgData = process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local', 'share');
      baseDir = path.join(xdgData, APP_NAME);
    }
  } catch (err) {
    throw new Error(`Failed to resolve DB base path: ${String(err)}`);
  }

  return path.join(baseDir, DB_FILENAME);
}

const SCHEMA_V0_SQL = `
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

CREATE TABLE IF NOT EXISTS impostazioni (
  chiave     TEXT PRIMARY KEY,
  valore     TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const cols = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

// Migration v2: aggiunge descrizione a movimenti (colonna assente nei DB creati prima che venisse aggiunta allo schema)
function migrateToV2(db: Database.Database): void {
  db.transaction(() => {
    if (!hasColumn(db, 'movimenti', 'descrizione')) {
      db.exec(`ALTER TABLE movimenti ADD COLUMN descrizione TEXT`);
    }
    db.pragma('user_version = 2');
  })();
}

// Migration v1: aggiunge predefinita/predefinito, riscrive dettagli come lookup, aggiunge dettaglio_id a movimenti
function migrateToV1(db: Database.Database): void {
  db.transaction(() => {
    if (!hasColumn(db, 'categorie', 'predefinita')) {
      db.exec(`ALTER TABLE categorie ADD COLUMN predefinita INTEGER NOT NULL DEFAULT 0`);
    }

    if (!hasColumn(db, 'metodi_pagamento', 'predefinito')) {
      db.exec(`ALTER TABLE metodi_pagamento ADD COLUMN predefinito INTEGER NOT NULL DEFAULT 0`);
    }

    // Ricrea dettagli come entità di lookup solo se era nel vecchio formato key-value
    // (senza colonna nome). Se la colonna nome esiste già (DB Python o migrazione già
    // applicata) il DROP distruggerebbe i dati e romperebbe le FK su movimenti.dettaglio_id.
    if (!hasColumn(db, 'dettagli', 'nome')) {
      db.exec(`DROP TABLE IF EXISTS dettagli`);
      db.exec(`
        CREATE TABLE IF NOT EXISTS dettagli (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          nome         TEXT    NOT NULL UNIQUE,
          categoria_id INTEGER REFERENCES categorie(id) ON DELETE SET NULL,
          predefinito  INTEGER NOT NULL DEFAULT 0,
          created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        )
      `);
    }

    if (!hasColumn(db, 'movimenti', 'dettaglio_id')) {
      db.exec(`ALTER TABLE movimenti ADD COLUMN dettaglio_id INTEGER REFERENCES dettagli(id) ON DELETE SET NULL`);
    }

    db.pragma('user_version = 1');
  })();
}

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
      `INSERT OR IGNORE INTO categorie (nome, predefinita) VALUES (?, 1)`,
    );
    const insertMetodo = db.prepare(
      `INSERT OR IGNORE INTO metodi_pagamento (nome, predefinito) VALUES (?, 1)`,
    );

    // Aggiorna le righe già esistenti (seed v0) per marcarle come predefinite
    const markCatPredefinite = db.prepare(
      `UPDATE categorie SET predefinita = 1 WHERE nome = ? AND predefinita = 0`,
    );
    const markMetodoPredefinito = db.prepare(
      `UPDATE metodi_pagamento SET predefinito = 1 WHERE nome = ? AND predefinito = 0`,
    );

    const seedAll = db.transaction(() => {
      for (const nome of DEFAULT_CATEGORIE) {
        insertCategoria.run(nome);
        markCatPredefinite.run(nome);
      }
      for (const nome of DEFAULT_METODI) {
        insertMetodo.run(nome);
        markMetodoPredefinito.run(nome);
      }
    });

    seedAll();
  } catch (err) {
    throw new Error(`Failed to seed default values: ${String(err)}`);
  }
}

export function initDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? getDbPath();

  if (resolvedPath !== ':memory:') {
    try {
      const dir = path.dirname(resolvedPath);
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      throw new Error(`Failed to create DB directory: ${String(err)}`);
    }

    const legacyPath = path.join(path.dirname(resolvedPath), LEGACY_DB_FILENAME);
    if (!fs.existsSync(resolvedPath) && fs.existsSync(legacyPath)) {
      console.warn(
        `[DB] File atteso non trovato: ${resolvedPath}\n` +
          `[DB] Trovato DB legacy: ${legacyPath}\n` +
          `[DB] Rinominare il file in "${DB_FILENAME}" per recuperare i dati precedenti.`,
      );
    }
  }

  let db: Database.Database;

  try {
    db = new Database(resolvedPath);
  } catch (err) {
    throw new Error(`Failed to open database at ${resolvedPath}: ${String(err)}`);
  }

  try {
    db.exec(SCHEMA_V0_SQL);
    const version = db.pragma('user_version', { simple: true }) as number;
    if (version < 1) {
      migrateToV1(db);
    }
    if (version < 2) {
      migrateToV2(db);
    }
  } catch (err) {
    db.close();
    throw new Error(`Failed to initialize schema: ${String(err)}`);
  }

  seedDefaults(db);

  return db;
}
