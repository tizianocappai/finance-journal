from datetime import date

import pytest

from finance_journal.repositories import CategoriaRepository, MovimentoRepository
from finance_journal.db.schema import _CATEGORIE_DEFAULT


@pytest.fixture
def repo(conn):
    return CategoriaRepository(conn)


@pytest.fixture
def mov_repo(conn):
    return MovimentoRepository(conn)


def _metodo_id(conn) -> int:
    return conn.execute("SELECT id FROM metodi_pagamento LIMIT 1").fetchone()["id"]


def test_list_contiene_default(repo):
    nomi = {c.nome for c in repo.list()}
    assert set(_CATEGORIE_DEFAULT) <= nomi


def test_create_aggiunge_categoria(repo):
    repo.create("Abbonamenti")
    nomi = {c.nome for c in repo.list()}
    assert "Abbonamenti" in nomi


def test_create_restituisce_categoria_con_id(repo):
    c = repo.create("Abbonamenti")
    assert c.id is not None
    assert c.nome == "Abbonamenti"
    assert c.predefinita is False


def test_predefinita_flag(repo):
    cats = repo.list()
    predefinite = [c for c in cats if c.predefinita]
    assert len(predefinite) == len(_CATEGORIE_DEFAULT)


def test_delete_categoria_non_in_uso(repo):
    c = repo.create("Temporanea")
    repo.delete(c.id)
    nomi = {cat.nome for cat in repo.list()}
    assert "Temporanea" not in nomi


def test_delete_categoria_in_uso_riassegna_ad_altro(repo, mov_repo, conn):
    c = repo.create("DaEliminare")
    mid = _metodo_id(conn)
    mov_repo.create_movimento(
        data=date(2025, 1, 15),
        tipo="uscita",
        importo=50.0,
        categoria_id=c.id,
        metodo_id=mid,
        sezione="personale",
    )
    altro_id = next(cat.id for cat in repo.list() if cat.nome == "Altro")
    repo.delete(c.id)
    movimenti = mov_repo.list(sezione="personale")
    assert all(m.categoria_id == altro_id for m in movimenti)
    assert c.nome not in {cat.nome for cat in repo.list()}


def test_delete_categoria_predefinita_solleva_errore(repo):
    predefinita = next(c for c in repo.list() if c.predefinita)
    with pytest.raises(ValueError, match="predefinita"):
        repo.delete(predefinita.id)
