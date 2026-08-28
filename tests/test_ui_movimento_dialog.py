"""Test validazione inline di MovimentoDialog con pytest-qt (#42)."""
from __future__ import annotations

import sqlite3

import pytest

from finance_journal.db.schema import create_tables, seed_defaults
from finance_journal.repositories.categoria import CategoriaRepository
from finance_journal.repositories.metodo_pagamento import MetodoPagamentoRepository
from finance_journal.ui.movimento_dialog import MovimentoDialog, _SENTINEL


@pytest.fixture
def conn():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    create_tables(c)
    seed_defaults(c)
    yield c
    c.close()


@pytest.fixture
def dialog(qtbot, conn):
    cat_repo = CategoriaRepository(conn)
    met_repo = MetodoPagamentoRepository(conn)
    cats = cat_repo.list()
    mets = met_repo.list()
    dlg = MovimentoDialog(categorie=cats, metodi=mets, cat_repo=cat_repo, met_repo=met_repo)
    qtbot.addWidget(dlg)
    dlg.show()
    dlg.activateWindow()
    qtbot.waitExposed(dlg)
    return dlg


def test_importo_error_label_inizialmente_nascosto(dialog: MovimentoDialog) -> None:
    """L'etichetta errore importo è nascosta all'apertura."""
    assert not dialog._importo_error.isVisible()


def test_importo_minimo_valido(dialog: MovimentoDialog) -> None:
    """Importo al minimo (0.01) è considerato valido."""
    dialog._importo_spin.setValue(0.01)
    valid = dialog._validate_importo()
    assert valid
    assert not dialog._importo_error.isVisible()


def test_categoria_invalida_mostra_errore(dialog: MovimentoDialog) -> None:
    """Nessuna categoria selezionabile → errore visibile sotto il campo."""
    while dialog._cat_combo.count() > 0:
        dialog._cat_combo.removeItem(0)
    valid = dialog._validate_categoria()
    assert not valid
    assert dialog._cat_error.isVisible()
    assert dialog._cat_error.text() != ""


def test_metodo_invalido_mostra_errore(dialog: MovimentoDialog) -> None:
    """Nessun metodo selezionabile → errore visibile sotto il campo."""
    while dialog._met_combo.count() > 0:
        dialog._met_combo.removeItem(0)
    valid = dialog._validate_metodo()
    assert not valid
    assert dialog._met_error.isVisible()
    assert dialog._met_error.text() != ""


def test_validate_focus_cat_se_cat_invalida(qtbot, dialog: MovimentoDialog) -> None:
    """Con categoria non valida e importo ok il focus va su _cat_combo."""
    dialog._importo_spin.setValue(10.0)
    while dialog._cat_combo.count() > 0:
        dialog._cat_combo.removeItem(0)
    dialog._validate()
    assert dialog._cat_combo.hasFocus()


def test_validate_focus_metodo_se_solo_metodo_invalido(qtbot, dialog: MovimentoDialog) -> None:
    """Con importo e categoria validi, metodo invalido → focus su _met_combo."""
    dialog._importo_spin.setValue(10.0)
    while dialog._met_combo.count() > 0:
        dialog._met_combo.removeItem(0)
    dialog._validate()
    assert dialog._met_combo.hasFocus()


def test_errore_scompare_dopo_correzione_categoria(dialog: MovimentoDialog, conn) -> None:
    """Errore categoria → aggiunta item valido + rivalidazione → label sparisce."""
    while dialog._cat_combo.count() > 0:
        dialog._cat_combo.removeItem(0)
    dialog._validate_categoria()
    assert dialog._cat_error.isVisible()

    # Ripristina una categoria valida
    cat_repo = CategoriaRepository(conn)
    cats = cat_repo.list()
    if cats:
        dialog._cat_combo.addItem(cats[0].nome, cats[0].id)
        dialog._cat_combo.setCurrentIndex(0)
    dialog._validate_categoria()
    assert not dialog._cat_error.isVisible()


def test_on_accept_rifiuta_con_cat_invalida(qtbot, dialog: MovimentoDialog) -> None:
    """Il dialog non si chiude se la categoria non è valida."""
    while dialog._cat_combo.count() > 0:
        dialog._cat_combo.removeItem(0)
    dialog._on_accept()
    assert dialog.isVisible(), "Il dialog non dovrebbe chiudersi con categoria non valida"


def test_on_accept_accetta_con_dati_validi(qtbot, dialog: MovimentoDialog) -> None:
    """Il dialog si chiude correttamente con dati validi."""
    dialog._importo_spin.setValue(25.50)
    with qtbot.waitSignal(dialog.accepted, timeout=1000):
        dialog._on_accept()


def test_tutti_error_label_inizialmente_nascosti(dialog: MovimentoDialog) -> None:
    """Tutti i label errore sono nascosti all'apertura del dialog."""
    assert not dialog._importo_error.isVisible()
    assert not dialog._cat_error.isVisible()
    assert not dialog._met_error.isVisible()
