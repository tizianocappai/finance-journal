from finance_journal.db.schema import _CATEGORIE_DEFAULT, _METODI_DEFAULT


def test_tabelle_create(conn):
    tabelle = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    assert {"movimenti", "categorie", "metodi_pagamento", "impostazioni"} <= tabelle


def test_seed_categorie_default(conn):
    nomi = {r["nome"] for r in conn.execute("SELECT nome FROM categorie").fetchall()}
    assert set(_CATEGORIE_DEFAULT) == nomi


def test_seed_metodi_default(conn):
    nomi = {r["nome"] for r in conn.execute("SELECT nome FROM metodi_pagamento").fetchall()}
    assert set(_METODI_DEFAULT) == nomi


def test_seed_idempotente(conn):
    from finance_journal.db.schema import seed_defaults
    seed_defaults(conn)
    seed_defaults(conn)
    count = conn.execute("SELECT COUNT(*) FROM categorie").fetchone()[0]
    assert count == len(_CATEGORIE_DEFAULT)


def test_tabella_dettagli_esiste_con_colonne(conn):
    tabelle = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    assert "dettagli" in tabelle
    colonne = {r["name"] for r in conn.execute("PRAGMA table_info('dettagli')").fetchall()}
    assert {"id", "nome", "categoria_id", "predefinita"} <= colonne


def test_movimenti_ha_colonna_dettaglio_id(conn):
    colonne = {r["name"] for r in conn.execute("PRAGMA table_info('movimenti')").fetchall()}
    assert "dettaglio_id" in colonne


def test_seed_dettagli_default(conn):
    from finance_journal.db.schema import _DETTAGLI_DEFAULT
    count = conn.execute("SELECT COUNT(*) FROM dettagli WHERE predefinita = 1").fetchone()[0]
    assert count == len(_DETTAGLI_DEFAULT)


def test_seed_dettagli_idempotente(conn):
    from finance_journal.db.schema import seed_defaults, _DETTAGLI_DEFAULT
    seed_defaults(conn)
    seed_defaults(conn)
    count = conn.execute("SELECT COUNT(*) FROM dettagli").fetchone()[0]
    assert count == len(_DETTAGLI_DEFAULT)
