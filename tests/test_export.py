import csv
import json
from datetime import date
from pathlib import Path

import pytest

from finance_journal.export import export_csv, export_json
from finance_journal.repositories.movimento import MovimentoRepository


def _ids(conn):
    cat_id = conn.execute("SELECT id FROM categorie LIMIT 1").fetchone()["id"]
    met_id = conn.execute("SELECT id FROM metodi_pagamento LIMIT 1").fetchone()["id"]
    return cat_id, met_id


@pytest.fixture
def repo(conn):
    return MovimentoRepository(conn)


@pytest.fixture
def con_movimenti(conn, repo):
    cat_id, met_id = _ids(conn)
    repo.create_movimento(
        data=date(2025, 3, 10),
        tipo="entrata",
        importo=1000.0,
        categoria_id=cat_id,
        metodo_id=met_id,
        sezione="personale",
        nota="Stipendio",
    )
    repo.create_movimento(
        data=date(2025, 3, 15),
        tipo="uscita",
        importo=200.0,
        categoria_id=cat_id,
        metodo_id=met_id,
        sezione="personale",
        nota="Spesa",
    )
    return conn


# --- CSV ---

def test_csv_crea_file(con_movimenti, tmp_path):
    dest = tmp_path / "out.csv"
    export_csv(con_movimenti, dest)
    assert dest.exists()


def test_csv_intestazione(con_movimenti, tmp_path):
    dest = tmp_path / "out.csv"
    export_csv(con_movimenti, dest)
    with open(dest, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        assert reader.fieldnames == ["Data", "Tipo", "Importo", "Categoria", "Metodo di pagamento", "Nota"]


def test_csv_righe_movimenti(con_movimenti, tmp_path):
    dest = tmp_path / "out.csv"
    export_csv(con_movimenti, dest)
    with open(dest, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert len(rows) == 2


def test_csv_importo_entrata_positivo(con_movimenti, tmp_path):
    dest = tmp_path / "out.csv"
    export_csv(con_movimenti, dest)
    with open(dest, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    entrata = next(r for r in rows if r["Tipo"] == "Entrata")
    assert float(entrata["Importo"]) > 0


def test_csv_importo_uscita_negativo(con_movimenti, tmp_path):
    dest = tmp_path / "out.csv"
    export_csv(con_movimenti, dest)
    with open(dest, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    uscita = next(r for r in rows if r["Tipo"] == "Uscita")
    assert float(uscita["Importo"]) < 0


def test_csv_nomi_categoria_metodo(con_movimenti, tmp_path):
    dest = tmp_path / "out.csv"
    export_csv(con_movimenti, dest)
    with open(dest, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        assert r["Categoria"] != ""
        assert r["Metodo di pagamento"] != ""


def test_csv_escludi_sezione_diversa(conn, repo, tmp_path):
    cat_id, met_id = _ids(conn)
    repo.create_movimento(
        data=date(2025, 1, 1),
        tipo="uscita",
        importo=50.0,
        categoria_id=cat_id,
        metodo_id=met_id,
        sezione="casa",
        nota="Casa",
    )
    dest = tmp_path / "out.csv"
    export_csv(conn, dest)
    with open(dest, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert all(r["Nota"] != "Casa" for r in rows)


def test_csv_vuoto_senza_movimenti(conn, tmp_path):
    dest = tmp_path / "out.csv"
    export_csv(conn, dest)
    with open(dest, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert rows == []


# --- JSON ---

def test_json_crea_file(con_movimenti, tmp_path):
    dest = tmp_path / "out.json"
    export_json(con_movimenti, dest)
    assert dest.exists()


def test_json_array(con_movimenti, tmp_path):
    dest = tmp_path / "out.json"
    export_json(con_movimenti, dest)
    data = json.loads(dest.read_text(encoding="utf-8"))
    assert isinstance(data, list)
    assert len(data) == 2


def test_json_campi(con_movimenti, tmp_path):
    dest = tmp_path / "out.json"
    export_json(con_movimenti, dest)
    data = json.loads(dest.read_text(encoding="utf-8"))
    expected_keys = {"Data", "Tipo", "Importo", "Categoria", "Metodo di pagamento", "Nota"}
    for obj in data:
        assert set(obj.keys()) == expected_keys


def test_json_importo_firmato(con_movimenti, tmp_path):
    dest = tmp_path / "out.json"
    export_json(con_movimenti, dest)
    data = json.loads(dest.read_text(encoding="utf-8"))
    entrata = next(o for o in data if o["Tipo"] == "Entrata")
    uscita = next(o for o in data if o["Tipo"] == "Uscita")
    assert entrata["Importo"] > 0
    assert uscita["Importo"] < 0


def test_json_importo_e_numero(con_movimenti, tmp_path):
    dest = tmp_path / "out.json"
    export_json(con_movimenti, dest)
    data = json.loads(dest.read_text(encoding="utf-8"))
    for obj in data:
        assert isinstance(obj["Importo"], (int, float))


def test_json_vuoto_senza_movimenti(conn, tmp_path):
    dest = tmp_path / "out.json"
    export_json(conn, dest)
    data = json.loads(dest.read_text(encoding="utf-8"))
    assert data == []
