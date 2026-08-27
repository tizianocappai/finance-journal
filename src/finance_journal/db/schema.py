import sqlite3

_DDL = """
CREATE TABLE IF NOT EXISTS categorie (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL UNIQUE,
    predefinita INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS metodi_pagamento (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL UNIQUE,
    predefinito INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dettagli (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL UNIQUE,
    categoria_id INTEGER NOT NULL REFERENCES categorie(id),
    predefinita INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS movimenti (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    data        TEXT NOT NULL,
    tipo        TEXT NOT NULL CHECK(tipo IN ('entrata', 'uscita')),
    importo     REAL NOT NULL CHECK(importo > 0),
    categoria_id INTEGER NOT NULL REFERENCES categorie(id),
    metodo_id   INTEGER NOT NULL REFERENCES metodi_pagamento(id),
    dettaglio_id INTEGER REFERENCES dettagli(id),
    nota        TEXT NOT NULL DEFAULT '',
    sezione     TEXT NOT NULL DEFAULT 'personale' CHECK(sezione IN ('personale', 'casa')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS impostazioni (
    chiave TEXT PRIMARY KEY,
    valore TEXT
);
"""

FALLBACK_NOME = "Altro"

_CATEGORIE_DEFAULT = [
    "Stipendio", "Freelance", "Spesa", "Bollette",
    "Trasporti", "Salute", "Svago", FALLBACK_NOME,
]

_METODI_DEFAULT = [
    "Contanti", "Carta di debito", "Carta di credito", "Bonifico", "Altro",
]

_DETTAGLI_DEFAULT = [
    ("Stipendio mensile", "Stipendio"),
    ("Freelance/consulenza", "Freelance"),
    ("Rimborso spese", "Altro"),
    ("Regalo ricevuto", "Altro"),
    ("Affitto/mutuo", "Bollette"),
    ("Bolletta luce", "Bollette"),
    ("Bolletta gas", "Bollette"),
    ("Internet/telefono", "Bollette"),
    ("Condominio", "Bollette"),
    ("Supermercato", "Spesa"),
    ("Ristorante/bar", "Svago"),
    ("Carburante", "Trasporti"),
    ("Farmacia", "Salute"),
    ("Abbonamento streaming", "Svago"),
    ("Abbigliamento", "Svago"),
    ("Sport/palestra", "Salute"),
    ("Svago/intrattenimento", "Svago"),
]


def create_tables(conn: sqlite3.Connection) -> None:
    conn.executescript(_DDL)
    # Migration: add dettaglio_id to movimenti for existing databases
    col_exists = conn.execute(
        "SELECT COUNT(*) FROM pragma_table_info('movimenti') WHERE name='dettaglio_id'"
    ).fetchone()[0]
    if not col_exists:
        conn.execute("ALTER TABLE movimenti ADD COLUMN dettaglio_id INTEGER REFERENCES dettagli(id)")
    conn.commit()


def seed_defaults(conn: sqlite3.Connection) -> None:
    for nome in _CATEGORIE_DEFAULT:
        conn.execute(
            "INSERT OR IGNORE INTO categorie (nome, predefinita) VALUES (?, 1)",
            (nome,),
        )
    for nome in _METODI_DEFAULT:
        conn.execute(
            "INSERT OR IGNORE INTO metodi_pagamento (nome, predefinito) VALUES (?, 1)",
            (nome,),
        )
    for nome, cat_nome in _DETTAGLI_DEFAULT:
        row = conn.execute("SELECT id FROM categorie WHERE nome = ?", (cat_nome,)).fetchone()
        if row:
            conn.execute(
                "INSERT OR IGNORE INTO dettagli (nome, categoria_id, predefinita) VALUES (?, ?, 1)",
                (nome, row["id"]),
            )
    conn.commit()
