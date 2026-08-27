import pytest

from finance_journal.repositories import ImpostazioniRepository


@pytest.fixture
def repo(conn):
    return ImpostazioniRepository(conn)


def test_get_chiave_assente_restituisce_none(repo):
    assert repo.get("inesistente") is None


def test_get_chiave_assente_con_default(repo):
    assert repo.get("inesistente", "EUR") == "EUR"


def test_set_e_get(repo):
    repo.set("valuta_simbolo", "€")
    assert repo.get("valuta_simbolo") == "€"


def test_set_sovrascrive(repo):
    repo.set("valuta_simbolo", "€")
    repo.set("valuta_simbolo", "$")
    assert repo.get("valuta_simbolo") == "$"


def test_set_multiple_chiavi(repo):
    repo.set("valuta_simbolo", "€")
    repo.set("valuta_codice", "EUR")
    assert repo.get("valuta_simbolo") == "€"
    assert repo.get("valuta_codice") == "EUR"
