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

// Migration v3: aggiunge updated_at e created_at a movimenti (assenti nei DB creati dallo stack Python).
// SQLite non ammette DEFAULT (datetime('now')) in ALTER TABLE, quindi si usa '' come placeholder
// per le righe storiche; tutte le scritture future impostano il valore tramite SQL.
function migrateToV3(db: Database.Database): void {
  db.transaction(() => {
    if (!hasColumn(db, 'movimenti', 'created_at')) {
      db.exec(`ALTER TABLE movimenti ADD COLUMN created_at TEXT NOT NULL DEFAULT ''`);
    }
    if (!hasColumn(db, 'movimenti', 'updated_at')) {
      db.exec(`ALTER TABLE movimenti ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`);
    }
    db.pragma('user_version = 3');
  })();
}

// Migration v4: crea tabelle patrimonio_gruppi, patrimonio_voci, patrimonio_valori
function migrateToV4(db: Database.Database): void {
  try {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS patrimonio_gruppi (
          id     INTEGER PRIMARY KEY AUTOINCREMENT,
          nome   TEXT    NOT NULL,
          tipo   TEXT    NOT NULL CHECK (tipo IN ('attivo', 'passivo')),
          ordine INTEGER NOT NULL DEFAULT 0,
          UNIQUE (nome, tipo)
        );

        CREATE TABLE IF NOT EXISTS patrimonio_voci (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          nome       TEXT    NOT NULL,
          tipo       TEXT    NOT NULL CHECK (tipo IN ('attivo', 'passivo')),
          gruppo_id  INTEGER REFERENCES patrimonio_gruppi(id) ON DELETE SET NULL,
          attiva     INTEGER NOT NULL DEFAULT 1,
          ordine     INTEGER NOT NULL DEFAULT 0,
          created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS patrimonio_valori (
          id      INTEGER PRIMARY KEY AUTOINCREMENT,
          voce_id INTEGER NOT NULL REFERENCES patrimonio_voci(id) ON DELETE CASCADE,
          anno    INTEGER NOT NULL,
          mese    INTEGER NOT NULL CHECK (mese BETWEEN 1 AND 12),
          importo REAL    NOT NULL,
          UNIQUE (voce_id, anno, mese)
        );
      `);
      db.pragma('user_version = 4');
    })();
  } catch (err) {
    throw new Error(`Failed to apply migration v4: ${String(err)}`);
  }
}

// Migration v5: aggiunge anno_archiviato a patrimonio_voci per archiviazione per-anno
function migrateToV5(db: Database.Database): void {
  try {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE patrimonio_voci ADD COLUMN anno_archiviato INTEGER DEFAULT NULL;
        UPDATE patrimonio_voci SET anno_archiviato = 0 WHERE attiva = 0;
      `);
      db.pragma('user_version = 5');
    })();
  } catch (err) {
    throw new Error(`Failed to apply migration v5: ${String(err)}`);
  }
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
    if (version < 3) {
      migrateToV3(db);
    }
    if (version < 4) {
      migrateToV4(db);
    }
    if (version < 5) {
      migrateToV5(db);
    }
  } catch (err) {
    db.close();
    throw new Error(`Failed to initialize schema: ${String(err)}`);
  }

  seedDefaults(db);

  return db;
}
