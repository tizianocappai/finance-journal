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

CREATE TABLE IF NOT EXISTS movimenti (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    data        TEXT NOT NULL,
    tipo        TEXT NOT NULL CHECK(tipo IN ('entrata', 'uscita')),
    importo     REAL NOT NULL CHECK(importo > 0),
    categoria_id INTEGER NOT NULL REFERENCES categorie(id),
    metodo_id   INTEGER NOT NULL REFERENCES metodi_pagamento(id),
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


def create_tables(conn: sqlite3.Connection) -> None:
    conn.executescript(_DDL)
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
    conn.commit()
