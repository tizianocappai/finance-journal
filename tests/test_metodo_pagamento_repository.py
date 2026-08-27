from datetime import date

import pytest

from finance_journal.repositories import MetodoPagamentoRepository, MovimentoRepository
from finance_journal.db.schema import _METODI_DEFAULT


@pytest.fixture
def repo(conn):
    return MetodoPagamentoRepository(conn)


@pytest.fixture
def mov_repo(conn):
    return MovimentoRepository(conn)


def _categoria_id(conn) -> int:
    return conn.execute("SELECT id FROM categorie LIMIT 1").fetchone()["id"]


def test_list_contiene_default(repo):
    nomi = {m.nome for m in repo.list()}
    assert set(_METODI_DEFAULT) <= nomi


def test_create_aggiunge_metodo(repo):
    repo.create("PayPal")
    nomi = {m.nome for m in repo.list()}
    assert "PayPal" in nomi


def test_create_restituisce_metodo_con_id(repo):
    m = repo.create("PayPal")
    assert m.id is not None
    assert m.nome == "PayPal"
    assert m.predefinito is False


def test_predefinito_flag(repo):
    metodi = repo.list()
    predefiniti = [m for m in metodi if m.predefinito]
    assert len(predefiniti) == len(_METODI_DEFAULT)


def test_delete_metodo_non_in_uso(repo):
    m = repo.create("Temporaneo")
    repo.delete(m.id)
    nomi = {met.nome for met in repo.list()}
    assert "Temporaneo" not in nomi


def test_delete_metodo_in_uso_riassegna_ad_altro(repo, mov_repo, conn):
    m = repo.create("DaEliminare")
    cid = _categoria_id(conn)
    mov_repo.create_movimento(
        data=date(2025, 1, 15),
        tipo="uscita",
        importo=30.0,
        categoria_id=cid,
        metodo_id=m.id,
        sezione="personale",
    )
    altro_id = next(met.id for met in repo.list() if met.nome == "Altro")
    repo.delete(m.id)
    movimenti = mov_repo.list(sezione="personale")
    assert all(mov.metodo_id == altro_id for mov in movimenti)
    assert m.nome not in {met.nome for met in repo.list()}


def test_delete_metodo_predefinito_solleva_errore(repo):
    predefinito = next(m for m in repo.list() if m.predefinito)
    with pytest.raises(ValueError, match="predefinito"):
        repo.delete(predefinito.id)
