"""Test widget MovimentiWidget con pytest-qt."""
from __future__ import annotations

import sqlite3
from datetime import date

import pytest

from finance_journal.db.schema import create_tables, seed_defaults
from finance_journal.repositories.movimento import MovimentoRepository
from finance_journal.ui.movimenti import MovimentiWidget
from finance_journal.ui.toast import Toast


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
def widget(qtbot, conn):
    w = MovimentiWidget(conn)
    w.resize(1000, 600)
    qtbot.addWidget(w)
    w.show()
    return w


def _get_default_ids(conn: sqlite3.Connection) -> tuple[int, int]:
    cat = conn.execute("SELECT id FROM categorie LIMIT 1").fetchone()["id"]
    met = conn.execute("SELECT id FROM metodi_pagamento LIMIT 1").fetchone()["id"]
    return cat, met


def test_empty_state_shown_when_no_movimenti(qtbot, widget: MovimentiWidget) -> None:
    assert widget._stack.currentIndex() == 1, "Atteso empty state (indice 1)"


def test_table_shown_when_movimenti_exist(qtbot, conn, widget: MovimentiWidget) -> None:
    cat_id, met_id = _get_default_ids(conn)
    repo = MovimentoRepository(conn)
    repo.create_movimento(
        data=date(2024, 1, 15),
        tipo="uscita",
        importo=50.0,
        categoria_id=cat_id,
        metodo_id=met_id,
        sezione="personale",
    )
    widget.refresh()
    assert widget._stack.currentIndex() == 0, "Atteso tabella (indice 0)"
    assert widget._table.rowCount() == 1


def test_filters_persist_after_refresh(qtbot, conn, widget: MovimentiWidget) -> None:
    widget._mese_combo.setCurrentIndex(3)
    mese_before = widget._mese_combo.currentData()
    widget.refresh()
    assert widget._mese_combo.currentData() == mese_before


def test_debounce_timer_exists(widget: MovimentiWidget) -> None:
    assert widget._debounce_timer.isSingleShot()
    assert widget._debounce_timer.interval() == 300


def test_search_triggers_debounce(qtbot, widget: MovimentiWidget) -> None:
    with qtbot.waitSignal(widget._debounce_timer.timeout, timeout=500):
        widget._search_edit.setText("test")


def test_delete_button_has_danger_property(qtbot, conn, widget: MovimentiWidget) -> None:
    cat_id, met_id = _get_default_ids(conn)
    repo = MovimentoRepository(conn)
    repo.create_movimento(
        data=date(2024, 1, 15),
        tipo="uscita",
        importo=25.0,
        categoria_id=cat_id,
        metodo_id=met_id,
        sezione="personale",
    )
    widget.refresh()

    from PyQt6.QtWidgets import QPushButton
    del_btns = [
        b for b in widget._table.findChildren(QPushButton) if b.text() == "Elimina"
    ]
    assert del_btns, "Pulsante Elimina non trovato in tabella"
    assert del_btns[0].property("danger"), "Pulsante Elimina deve avere property danger=True"


def test_toast_shown_after_add(qtbot, conn, widget: MovimentiWidget, monkeypatch) -> None:
    toasts_shown = []

    original = widget._show_toast

    def _capture_toast(msg, undo_callback=None):
        toasts_shown.append(msg)

    monkeypatch.setattr(widget, "_show_toast", _capture_toast)

    from finance_journal.ui.movimento_dialog import MovimentoDialog
    cat_id, met_id = _get_default_ids(conn)

    monkeypatch.setattr(MovimentoDialog, "exec", lambda self: MovimentoDialog.DialogCode.Accepted)
    monkeypatch.setattr(
        MovimentoDialog, "get_data",
        lambda self: {
            "data": date(2024, 3, 10),
            "tipo": "uscita",
            "importo": 30.0,
            "categoria_id": cat_id,
            "metodo_id": met_id,
            "nota": "",
            "dettaglio_id": None,
        },
    )

    widget._on_add()
    assert any("aggiunto" in m.lower() for m in toasts_shown)


def test_undo_after_delete_restores_movimento(qtbot, conn, widget: MovimentiWidget) -> None:
    cat_id, met_id = _get_default_ids(conn)
    repo = MovimentoRepository(conn)
    repo.create_movimento(
        data=date(2024, 5, 1),
        tipo="entrata",
        importo=100.0,
        categoria_id=cat_id,
        metodo_id=met_id,
        sezione="personale",
    )
    widget.refresh()
    assert widget._table.rowCount() == 1

    undo_fn = None

    def _capture_toast(msg, undo_callback=None):
        nonlocal undo_fn
        undo_fn = undo_callback

    widget._show_toast = _capture_toast

    from unittest.mock import patch
    with patch("finance_journal.ui.movimenti.QMessageBox.question", return_value=__import__("PyQt6.QtWidgets", fromlist=["QMessageBox"]).QMessageBox.StandardButton.Yes):
        widget._on_elimina_riga(0)

    assert widget._table.rowCount() == 0

    assert undo_fn is not None
    undo_fn()

    movimenti = repo.list(sezione="personale")
    assert len(movimenti) == 1
    assert movimenti[0].importo == 100.0
