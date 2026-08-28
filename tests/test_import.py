import csv
import sqlite3
from pathlib import Path

import pytest

from finance_journal.import_csv import ImportResult, RigaSaltata, import_csv


def _make_csv(tmp_path: Path, rows: list[dict], header: list[str] | None = None) -> Path:
    p = tmp_path / "import.csv"
    header = header or ["Data", "Tipo", "Importo", "Account", "Dettaglio", "Categoria", "Note"]
    with open(p, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)
    return p


def _count_movimenti(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) FROM movimenti").fetchone()[0]


# --- base import ---

def test_import_base(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-03-10", "Tipo": "Entrata", "Importo": "1000",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Stipendio", "Note": ""},
    ])
    result = import_csv(conn, p)
    assert result.importati == 1
    assert result.saltati == []
    assert _count_movimenti(conn) == 1


def test_import_dati_movimento(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-06-15", "Tipo": "Uscita", "Importo": "50",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": "test"},
    ])
    import_csv(conn, p)
    row = conn.execute("SELECT * FROM movimenti").fetchone()
    assert row["data"] == "2025-06-15"
    assert row["tipo"] == "uscita"
    assert row["importo"] == 50.0
    assert row["nota"] == "test"
    assert row["sezione"] == "personale"


# --- auto-create entities ---

def test_import_crea_categoria(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "NuovaCategoria", "Note": ""},
    ])
    result = import_csv(conn, p)
    assert "NuovaCategoria" in result.create_categorie
    assert conn.execute("SELECT id FROM categorie WHERE nome = 'NuovaCategoria'").fetchone() is not None


def test_import_crea_account(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "10",
         "Account": "NuovoAccount", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    result = import_csv(conn, p)
    assert "NuovoAccount" in result.create_account
    assert conn.execute("SELECT id FROM metodi_pagamento WHERE nome = 'NuovoAccount'").fetchone() is not None


def test_import_crea_dettaglio(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "NuovoDettaglio", "Categoria": "Spesa", "Note": ""},
    ])
    result = import_csv(conn, p)
    assert "NuovoDettaglio" in result.create_dettagli
    assert conn.execute("SELECT id FROM dettagli WHERE nome = 'NuovoDettaglio'").fetchone() is not None


def test_import_dettaglio_creato_con_categoria_corretta(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "DettaglioNuovo", "Categoria": "Svago", "Note": ""},
    ])
    import_csv(conn, p)
    det = conn.execute("SELECT categoria_id FROM dettagli WHERE nome = 'DettaglioNuovo'").fetchone()
    svago_id = conn.execute("SELECT id FROM categorie WHERE nome = 'Svago'").fetchone()["id"]
    assert det["categoria_id"] == svago_id


# --- override dettaglio↔categoria ---

def test_import_override_dettaglio_categoria(conn, tmp_path):
    # "Supermercato" → normalmente legato a "Spesa"; importiamo con "Bollette"
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "20",
         "Account": "Contanti", "Dettaglio": "Supermercato", "Categoria": "Bollette", "Note": ""},
    ])
    import_csv(conn, p)
    m = conn.execute("SELECT categoria_id, dettaglio_id FROM movimenti").fetchone()
    bollette_id = conn.execute("SELECT id FROM categorie WHERE nome = 'Bollette'").fetchone()["id"]
    sup = conn.execute("SELECT id, categoria_id FROM dettagli WHERE nome = 'Supermercato'").fetchone()
    spesa_id = conn.execute("SELECT id FROM categorie WHERE nome = 'Spesa'").fetchone()["id"]
    assert m["categoria_id"] == bollette_id       # override sul movimento
    assert m["dettaglio_id"] == sup["id"]          # dettaglio ancora collegato
    assert sup["categoria_id"] == spesa_id          # associazione globale invariata


# --- righe invalide ---

def test_import_tipo_non_valido_saltato(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Trasferimento", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    result = import_csv(conn, p)
    assert result.importati == 0
    assert len(result.saltati) == 1
    assert result.saltati[0].numero == 2


def test_import_importo_non_numerico_saltato(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "abc",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    result = import_csv(conn, p)
    assert result.importati == 0
    assert len(result.saltati) == 1


def test_import_importo_negativo_saltato(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "-10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    result = import_csv(conn, p)
    assert result.importati == 0
    assert len(result.saltati) == 1


def test_import_categoria_vuota_saltata(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "", "Note": ""},
    ])
    result = import_csv(conn, p)
    assert result.importati == 0
    assert len(result.saltati) == 1


def test_import_data_non_riconoscibile_saltata(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "not-a-date", "Tipo": "Uscita", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    result = import_csv(conn, p)
    assert result.importati == 0
    assert len(result.saltati) == 1


def test_import_righe_invalide_non_bloccano_import(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "INVALIDO", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
        {"Data": "2025-01-02", "Tipo": "Uscita", "Importo": "20",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    result = import_csv(conn, p)
    assert result.importati == 1
    assert len(result.saltati) == 1
    assert _count_movimenti(conn) == 1


# --- duplicati ---

def test_import_duplicati_permessi(conn, tmp_path):
    row = {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "10",
           "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""}
    p = _make_csv(tmp_path, [row, row])
    result = import_csv(conn, p)
    assert result.importati == 2
    assert _count_movimenti(conn) == 2


# --- header case-insensitive ---

def test_import_header_case_insensitive(conn, tmp_path):
    header = ["DATA", "TIPO", "IMPORTO", "ACCOUNT", "DETTAGLIO", "CATEGORIA", "NOTE"]
    p = _make_csv(tmp_path, [
        {"DATA": "2025-01-01", "TIPO": "Uscita", "IMPORTO": "10",
         "ACCOUNT": "Contanti", "DETTAGLIO": "", "CATEGORIA": "Spesa", "NOTE": ""},
    ], header=header)
    result = import_csv(conn, p)
    assert result.importati == 1
    assert _count_movimenti(conn) == 1


# --- formati data ---

def test_import_data_yyyymmdd(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-03-15", "Tipo": "Entrata", "Importo": "100",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Stipendio", "Note": ""},
    ])
    import_csv(conn, p)
    assert conn.execute("SELECT data FROM movimenti").fetchone()["data"] == "2025-03-15"


def test_import_data_ddmmyyyy_slash(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "15/03/2025", "Tipo": "Entrata", "Importo": "100",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Stipendio", "Note": ""},
    ])
    import_csv(conn, p)
    assert conn.execute("SELECT data FROM movimenti").fetchone()["data"] == "2025-03-15"


def test_import_data_ddmmyyyy_dash(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "15-03-2025", "Tipo": "Entrata", "Importo": "100",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Stipendio", "Note": ""},
    ])
    import_csv(conn, p)
    assert conn.execute("SELECT data FROM movimenti").fetchone()["data"] == "2025-03-15"


# --- campi opzionali ---

def test_import_dettaglio_vuoto_nullable(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    import_csv(conn, p)
    assert conn.execute("SELECT dettaglio_id FROM movimenti").fetchone()["dettaglio_id"] is None


def test_import_note_vuote(conn, tmp_path):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    import_csv(conn, p)
    assert conn.execute("SELECT nota FROM movimenti").fetchone()["nota"] == ""


def test_import_colonna_dettaglio_assente(conn, tmp_path):
    header = ["Data", "Tipo", "Importo", "Account", "Categoria", "Note"]
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Uscita", "Importo": "10",
         "Account": "Contanti", "Categoria": "Spesa", "Note": ""},
    ], header=header)
    result = import_csv(conn, p)
    assert result.importati == 1
    assert conn.execute("SELECT dettaglio_id FROM movimenti").fetchone()["dettaglio_id"] is None


# --- logging ---

import logging


def test_riga_saltata_emette_warning(conn, tmp_path, caplog):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "INVALIDO", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    with caplog.at_level(logging.WARNING, logger="finance_journal.import_csv"):
        import_csv(conn, p)
    assert any("WARNING" in r.levelname and "INVALIDO" in r.message for r in caplog.records)


def test_import_completato_emette_info(conn, tmp_path, caplog):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "Entrata", "Importo": "100",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Stipendio", "Note": ""},
    ])
    with caplog.at_level(logging.INFO, logger="finance_journal.import_csv"):
        import_csv(conn, p)
    messages = [r.message for r in caplog.records if r.levelname == "INFO"]
    assert any("1" in m for m in messages)


def test_import_nessuna_riga_valida_emette_warning(conn, tmp_path, caplog):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "INVALIDO", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    with caplog.at_level(logging.WARNING, logger="finance_journal.import_csv"):
        import_csv(conn, p)
    warnings = [r.message for r in caplog.records if r.levelname == "WARNING"]
    assert len(warnings) >= 1


def test_import_fallito_zero_righe_emette_warning(conn, tmp_path, caplog):
    p = _make_csv(tmp_path, [
        {"Data": "2025-01-01", "Tipo": "INVALIDO", "Importo": "10",
         "Account": "Contanti", "Dettaglio": "", "Categoria": "Spesa", "Note": ""},
    ])
    with caplog.at_level(logging.WARNING, logger="finance_journal.import_csv"):
        result = import_csv(conn, p)
    assert result.importati == 0
    assert any("nessuna riga valida" in r.message.lower() for r in caplog.records if r.levelname == "WARNING")
