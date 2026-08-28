"""Test per avvio con tema persistito e delega a theme.py (AC di #38)."""
from __future__ import annotations

import sqlite3

import pytest

from finance_journal.db.schema import create_tables, seed_defaults
from finance_journal.repositories.impostazioni import ImpostazioniRepository
from finance_journal.ui.theme import _DARK, _LIGHT, get_stylesheet


@pytest.fixture
def conn():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    create_tables(c)
    seed_defaults(c)
    yield c
    c.close()


@pytest.mark.parametrize(
    "valore_persistito,atteso_in_css,assente_in_css",
    [
        ("scuro", _DARK.background, _LIGHT.background),
        ("chiaro", _LIGHT.background, _DARK.background),
        ("sistema", None, None),
    ],
)
def test_builder_selezionato_da_tema_persistito(
    conn: sqlite3.Connection,
    valore_persistito: str,
    atteso_in_css: str | None,
    assente_in_css: str | None,
) -> None:
    repo = ImpostazioniRepository(conn)
    repo.set("tema", valore_persistito)

    tema_letto = repo.get("tema", "sistema") or "sistema"
    assert tema_letto == valore_persistito

    css = get_stylesheet(tema_letto)

    if atteso_in_css:
        assert atteso_in_css in css, (
            f"CSS per tema '{valore_persistito}' non contiene {atteso_in_css!r}"
        )
    if assente_in_css:
        assert assente_in_css not in css, (
            f"CSS per tema '{valore_persistito}' non deve contenere {assente_in_css!r}"
        )
    if valore_persistito == "sistema":
        assert css == "", "Tema 'sistema' deve produrre CSS vuoto"


def test_tema_default_assente_restituisce_sistema(conn: sqlite3.Connection) -> None:
    repo = ImpostazioniRepository(conn)
    tema = repo.get("tema", "sistema") or "sistema"
    assert tema == "sistema"
    assert get_stylesheet(tema) == ""


def test_tema_scuro_non_applica_stylesheet_chiaro(conn: sqlite3.Connection) -> None:
    repo = ImpostazioniRepository(conn)
    repo.set("tema", "scuro")
    css = get_stylesheet(repo.get("tema", "sistema") or "sistema")
    assert _LIGHT.background not in css
    assert _DARK.background in css


def test_tema_chiaro_non_applica_stylesheet_scuro(conn: sqlite3.Connection) -> None:
    repo = ImpostazioniRepository(conn)
    repo.set("tema", "chiaro")
    css = get_stylesheet(repo.get("tema", "sistema") or "sistema")
    assert _DARK.background not in css
    assert _LIGHT.background in css
