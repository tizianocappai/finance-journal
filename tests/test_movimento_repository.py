from datetime import date

import pytest

from finance_journal.repositories import MovimentoRepository


@pytest.fixture
def repo(conn):
    return MovimentoRepository(conn)


def _cat_id(conn) -> int:
    return conn.execute("SELECT id FROM categorie LIMIT 1").fetchone()["id"]


def _met_id(conn) -> int:
    return conn.execute("SELECT id FROM metodi_pagamento LIMIT 1").fetchone()["id"]


def _altro_cat_id(conn) -> int:
    return conn.execute("SELECT id FROM categorie WHERE nome='Altro'").fetchone()["id"]


def _crea(repo, conn, **kw):
    defaults = dict(
        data=date(2025, 6, 15),
        tipo="uscita",
        importo=100.0,
        categoria_id=_cat_id(conn),
        metodo_id=_met_id(conn),
        sezione="personale",
        nota="",
    )
    defaults.update(kw)
    return repo.create_movimento(**defaults)


# --- Create ---

def test_create_restituisce_movimento_con_id(repo, conn):
    m = _crea(repo, conn)
    assert m.id is not None


def test_create_persiste_tutti_i_campi(repo, conn):
    cid = _cat_id(conn)
    mid = _met_id(conn)
    m = repo.create_movimento(
        data=date(2025, 3, 10),
        tipo="entrata",
        importo=1500.0,
        categoria_id=cid,
        metodo_id=mid,
        sezione="personale",
        nota="stipendio marzo",
    )
    assert m.data == date(2025, 3, 10)
    assert m.tipo == "entrata"
    assert m.importo == 1500.0
    assert m.categoria_id == cid
    assert m.metodo_id == mid
    assert m.nota == "stipendio marzo"
    assert m.sezione == "personale"


# --- List (filtri) ---

def test_list_senza_filtri_restituisce_tutti(repo, conn):
    _crea(repo, conn)
    _crea(repo, conn)
    assert len(repo.list(sezione="personale")) == 2


def test_list_filtro_anno(repo, conn):
    _crea(repo, conn, data=date(2024, 12, 1))
    _crea(repo, conn, data=date(2025, 1, 1))
    assert len(repo.list(sezione="personale", anno=2025)) == 1


def test_list_filtro_mese(repo, conn):
    _crea(repo, conn, data=date(2025, 3, 1))
    _crea(repo, conn, data=date(2025, 4, 1))
    risultati = repo.list(sezione="personale", anno=2025, mese=3)
    assert len(risultati) == 1
    assert risultati[0].data.month == 3


def test_list_filtro_tipo(repo, conn):
    _crea(repo, conn, tipo="entrata")
    _crea(repo, conn, tipo="uscita")
    assert len(repo.list(sezione="personale", tipo="entrata")) == 1


def test_list_filtro_categoria(repo, conn):
    cid1 = _cat_id(conn)
    cid2 = conn.execute(
        "SELECT id FROM categorie WHERE id != ? LIMIT 1", (cid1,)
    ).fetchone()["id"]
    _crea(repo, conn, categoria_id=cid1)
    _crea(repo, conn, categoria_id=cid2)
    assert len(repo.list(sezione="personale", categoria_id=cid1)) == 1


def test_list_filtro_metodo(repo, conn):
    mid1 = _met_id(conn)
    mid2 = conn.execute(
        "SELECT id FROM metodi_pagamento WHERE id != ? LIMIT 1", (mid1,)
    ).fetchone()["id"]
    _crea(repo, conn, metodo_id=mid1)
    _crea(repo, conn, metodo_id=mid2)
    assert len(repo.list(sezione="personale", metodo_id=mid1)) == 1


def test_list_filtro_testo(repo, conn):
    _crea(repo, conn, nota="farmacia centrale")
    _crea(repo, conn, nota="supermercato")
    assert len(repo.list(sezione="personale", testo="farmacia")) == 1


def test_list_filtri_combinati(repo, conn):
    _crea(repo, conn, data=date(2025, 3, 1), tipo="uscita", nota="bar")
    _crea(repo, conn, data=date(2025, 3, 1), tipo="entrata", nota="bar")
    _crea(repo, conn, data=date(2025, 4, 1), tipo="uscita", nota="bar")
    risultati = repo.list(sezione="personale", anno=2025, mese=3, tipo="uscita")
    assert len(risultati) == 1


def test_list_sezione_isolata(repo, conn):
    _crea(repo, conn, sezione="personale")
    _crea(repo, conn, sezione="casa")
    assert len(repo.list(sezione="personale")) == 1
    assert len(repo.list(sezione="casa")) == 1


# --- Update ---

def test_update_modifica_campi(repo, conn):
    m = _crea(repo, conn, importo=100.0, nota="originale")
    repo.update_movimento(m.id, importo=200.0, nota="modificato")
    aggiornato = repo.list(sezione="personale")[0]
    assert aggiornato.importo == 200.0
    assert aggiornato.nota == "modificato"


def test_update_solo_campo_specificato(repo, conn):
    m = _crea(repo, conn, importo=100.0, tipo="uscita")
    repo.update_movimento(m.id, importo=150.0)
    aggiornato = repo.list(sezione="personale")[0]
    assert aggiornato.importo == 150.0
    assert aggiornato.tipo == "uscita"


# --- Delete ---

def test_delete_rimuove_movimento(repo, conn):
    m = _crea(repo, conn)
    repo.delete_movimento(m.id)
    assert repo.list(sezione="personale") == []


def test_delete_rimuove_solo_il_movimento_specificato(repo, conn):
    m1 = _crea(repo, conn)
    m2 = _crea(repo, conn)
    repo.delete_movimento(m1.id)
    rimasti = repo.list(sezione="personale")
    assert len(rimasti) == 1
    assert rimasti[0].id == m2.id


# --- Delete All ---

def test_delete_all_senza_filtri_svuota_sezione(repo, conn):
    _crea(repo, conn)
    _crea(repo, conn)
    repo.delete_all(sezione="personale")
    assert repo.list(sezione="personale") == []


def test_delete_all_filtro_anno(repo, conn):
    _crea(repo, conn, data=date(2024, 6, 1))
    _crea(repo, conn, data=date(2025, 6, 1))
    repo.delete_all(sezione="personale", anno=2025)
    rimasti = repo.list(sezione="personale")
    assert len(rimasti) == 1
    assert rimasti[0].data.year == 2024


def test_delete_all_filtro_mese(repo, conn):
    _crea(repo, conn, data=date(2025, 3, 1))
    _crea(repo, conn, data=date(2025, 4, 1))
    repo.delete_all(sezione="personale", anno=2025, mese=3)
    rimasti = repo.list(sezione="personale")
    assert len(rimasti) == 1
    assert rimasti[0].data.month == 4


def test_delete_all_filtro_mese_standalone(repo, conn):
    _crea(repo, conn, data=date(2024, 3, 1))
    _crea(repo, conn, data=date(2025, 3, 1))
    _crea(repo, conn, data=date(2025, 4, 1))
    repo.delete_all(sezione="personale", mese=3)
    rimasti = repo.list(sezione="personale")
    assert len(rimasti) == 1
    assert rimasti[0].data.month == 4


def test_delete_all_filtro_tipo(repo, conn):
    _crea(repo, conn, tipo="entrata")
    _crea(repo, conn, tipo="uscita")
    repo.delete_all(sezione="personale", tipo="uscita")
    rimasti = repo.list(sezione="personale")
    assert len(rimasti) == 1
    assert rimasti[0].tipo == "entrata"


def test_delete_all_filtro_combinato(repo, conn):
    _crea(repo, conn, data=date(2025, 3, 1), tipo="uscita")
    _crea(repo, conn, data=date(2025, 3, 1), tipo="entrata")
    _crea(repo, conn, data=date(2025, 4, 1), tipo="uscita")
    repo.delete_all(sezione="personale", anno=2025, mese=3, tipo="uscita")
    rimasti = repo.list(sezione="personale")
    assert len(rimasti) == 2


def test_delete_all_isolamento_sezioni(repo, conn):
    _crea(repo, conn, sezione="personale")
    _crea(repo, conn, sezione="casa")
    repo.delete_all(sezione="personale")
    assert repo.list(sezione="personale") == []
    assert len(repo.list(sezione="casa")) == 1


# --- List Anni ---

def test_list_anni_ritorna_anni_distinti_in_ordine_desc(repo, conn):
    _crea(repo, conn, data=date(2024, 1, 1))
    _crea(repo, conn, data=date(2025, 6, 1))
    _crea(repo, conn, data=date(2025, 12, 31))
    anni = repo.list_anni(sezione="personale")
    assert anni == [2025, 2024]


def test_list_anni_isolamento_sezioni(repo, conn):
    _crea(repo, conn, data=date(2023, 1, 1), sezione="personale")
    _crea(repo, conn, data=date(2024, 1, 1), sezione="casa")
    assert repo.list_anni(sezione="personale") == [2023]


def test_list_anni_vuoto_se_nessun_movimento(repo, conn):
    assert repo.list_anni(sezione="personale") == []


# --- Dettaglio ---

def _det_id(conn) -> int:
    return conn.execute("SELECT id FROM dettagli LIMIT 1").fetchone()["id"]


def test_create_con_dettaglio_id_none(repo, conn):
    m = _crea(repo, conn)
    assert m.dettaglio_id is None


def test_create_con_dettaglio_id_valido(repo, conn):
    did = _det_id(conn)
    m = _crea(repo, conn, dettaglio_id=did)
    assert m.dettaglio_id == did


def test_update_con_dettaglio_id(repo, conn):
    did = _det_id(conn)
    m = _crea(repo, conn)
    repo.update_movimento(m.id, dettaglio_id=did)
    aggiornato = repo.list(sezione="personale")[0]
    assert aggiornato.dettaglio_id == did


# --- logging ---

import logging


def test_create_emette_info(repo, conn, caplog):
    with caplog.at_level(logging.INFO, logger="finance_journal.repositories.movimento"):
        m = _crea(repo, conn)
    messages = [r.message for r in caplog.records if r.levelname == "INFO"]
    assert any(str(m.id) in msg for msg in messages)


def test_update_emette_info(repo, conn, caplog):
    m = _crea(repo, conn)
    with caplog.at_level(logging.INFO, logger="finance_journal.repositories.movimento"):
        repo.update_movimento(m.id, importo=999.0)
    messages = [r.message for r in caplog.records if r.levelname == "INFO"]
    assert any(str(m.id) in msg for msg in messages)


def test_delete_emette_info(repo, conn, caplog):
    m = _crea(repo, conn)
    with caplog.at_level(logging.INFO, logger="finance_journal.repositories.movimento"):
        repo.delete_movimento(m.id)
    messages = [r.message for r in caplog.records if r.levelname == "INFO"]
    assert any(str(m.id) in msg for msg in messages)


def test_delete_all_emette_info_con_conteggio(repo, conn, caplog):
    _crea(repo, conn)
    _crea(repo, conn)
    with caplog.at_level(logging.INFO, logger="finance_journal.repositories.movimento"):
        repo.delete_all(sezione="personale")
    messages = [r.message for r in caplog.records if r.levelname == "INFO"]
    assert any("2" in msg for msg in messages)
