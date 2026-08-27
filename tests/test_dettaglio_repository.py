from datetime import date

import pytest

from finance_journal.repositories import DettaglioRepository, MovimentoRepository
from finance_journal.db.schema import _DETTAGLI_DEFAULT


@pytest.fixture
def repo(conn):
    return DettaglioRepository(conn)


@pytest.fixture
def mov_repo(conn):
    return MovimentoRepository(conn)


def _cat_id(conn, nome="Spesa") -> int:
    return conn.execute("SELECT id FROM categorie WHERE nome = ?", (nome,)).fetchone()["id"]


def _met_id(conn) -> int:
    return conn.execute("SELECT id FROM metodi_pagamento LIMIT 1").fetchone()["id"]


def test_list_contiene_predefiniti(repo):
    nomi = {d.nome for d in repo.list()}
    nomi_attesi = {nome for nome, _ in _DETTAGLI_DEFAULT}
    assert nomi_attesi <= nomi


def test_create_aggiunge_dettaglio(repo, conn):
    cid = _cat_id(conn)
    repo.create("Cinema", cid)
    nomi = {d.nome for d in repo.list()}
    assert "Cinema" in nomi


def test_create_restituisce_dettaglio_con_id(repo, conn):
    cid = _cat_id(conn)
    d = repo.create("Cinema", cid)
    assert d.id is not None
    assert d.nome == "Cinema"
    assert d.categoria_id == cid
    assert d.predefinita is False


def test_predefinita_flag(repo):
    predefiniti = [d for d in repo.list() if d.predefinita]
    assert len(predefiniti) == len(_DETTAGLI_DEFAULT)


def test_delete_dettaglio_non_in_uso(repo, conn):
    cid = _cat_id(conn)
    d = repo.create("Temporaneo", cid)
    repo.delete(d.id)
    nomi = {det.nome for det in repo.list()}
    assert "Temporaneo" not in nomi


def test_delete_dettaglio_in_uso_imposta_null(repo, mov_repo, conn):
    cid = _cat_id(conn)
    mid = _met_id(conn)
    d = repo.create("DaEliminare", cid)
    m = mov_repo.create_movimento(
        data=date(2025, 1, 15),
        tipo="uscita",
        importo=50.0,
        categoria_id=cid,
        metodo_id=mid,
        sezione="personale",
        dettaglio_id=d.id,
    )
    repo.delete(d.id)
    row = conn.execute("SELECT dettaglio_id FROM movimenti WHERE id = ?", (m.id,)).fetchone()
    assert row["dettaglio_id"] is None


def test_delete_dettaglio_in_uso_preserva_categoria_id(repo, mov_repo, conn):
    cid = _cat_id(conn)
    mid = _met_id(conn)
    d = repo.create("DaEliminare", cid)
    m = mov_repo.create_movimento(
        data=date(2025, 1, 15),
        tipo="uscita",
        importo=50.0,
        categoria_id=cid,
        metodo_id=mid,
        sezione="personale",
        dettaglio_id=d.id,
    )
    repo.delete(d.id)
    row = conn.execute("SELECT categoria_id FROM movimenti WHERE id = ?", (m.id,)).fetchone()
    assert row["categoria_id"] == cid


def test_delete_predefinito_solleva_errore(repo):
    predefinito = next(d for d in repo.list() if d.predefinita)
    with pytest.raises(ValueError, match="predefinito"):
        repo.delete(predefinito.id)
