"""Test scorciatoie da tastiera in MainWindow (#45)."""
from __future__ import annotations

import sqlite3

import pytest

from finance_journal.db.schema import create_tables, seed_defaults
from finance_journal.ui.dashboard import DashboardWidget
from finance_journal.ui.impostazioni import ImpostazioniWidget
from finance_journal.ui.movimenti import MovimentiWidget
from finance_journal.ui.sidebar import Sidebar
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
def win(qtbot, conn, monkeypatch):
    """MainWindow con connessione in-memory e senza aprire file reali."""
    from finance_journal.ui import main_window as mw_mod

    monkeypatch.setattr(mw_mod, "create_connection", lambda: conn)
    from finance_journal.ui.main_window import MainWindow

    w = MainWindow()
    w.resize(1100, 700)
    qtbot.addWidget(w)
    w.show()
    w.activateWindow()
    qtbot.waitExposed(w)
    return w


def test_ctrl_n_apre_dialog_nuovo_movimento(qtbot, win) -> None:
    """Ctrl+N apre il dialog Aggiungi Movimento."""
    called = []

    orig = win._movimenti.open_new_movement
    win._movimenti.open_new_movement = lambda: called.append(True)

    qtbot.keyClick(win, "N", modifier=__import__("PyQt6.QtCore", fromlist=["Qt"]).Qt.KeyboardModifier.ControlModifier)
    assert called, "Ctrl+N deve chiamare open_new_movement()"


def test_ctrl_n_naviga_a_movimenti_se_non_attivo(qtbot, win) -> None:
    """Ctrl+N porta sulla sezione Movimenti se si è su Dashboard."""
    assert win._sidebar.active_section() == "Dashboard"

    win._movimenti.open_new_movement = lambda: None
    from PyQt6.QtCore import Qt
    qtbot.keyClick(win, "N", modifier=Qt.KeyboardModifier.ControlModifier)

    assert win._sidebar.active_section() == "Movimenti"
    assert win._current is win._movimenti


def test_ctrl_f_porta_focus_su_ricerca(qtbot, win) -> None:
    """Ctrl+F porta il focus sul campo ricerca Movimenti."""
    focused = []

    orig = win._movimenti.focus_search
    win._movimenti.focus_search = lambda: focused.append(True)

    from PyQt6.QtCore import Qt
    qtbot.keyClick(win, "F", modifier=Qt.KeyboardModifier.ControlModifier)
    assert focused, "Ctrl+F deve chiamare focus_search()"


def test_ctrl_f_naviga_a_movimenti_se_non_attivo(qtbot, win) -> None:
    """Ctrl+F porta sulla sezione Movimenti se si è su Dashboard."""
    assert win._sidebar.active_section() == "Dashboard"

    win._movimenti.focus_search = lambda: None
    from PyQt6.QtCore import Qt
    qtbot.keyClick(win, "F", modifier=Qt.KeyboardModifier.ControlModifier)

    assert win._sidebar.active_section() == "Movimenti"


def test_esc_chiude_toast_visibile(qtbot, win) -> None:
    """Esc chiude un toast visibile quando nessun dialog è aperto."""
    toast = Toast("Test toast", parent=win.centralWidget(), duration=10_000)
    qtbot.addWidget(toast)
    assert toast.isVisible()

    from PyQt6.QtCore import Qt
    qtbot.keyClick(win, Qt.Key.Key_Escape)
    qtbot.waitUntil(lambda: not toast.isVisible(), timeout=500)


def test_esc_non_lancia_errori_senza_toast(qtbot, win) -> None:
    """Esc senza toast visibili non causa errori."""
    from PyQt6.QtCore import Qt
    qtbot.keyClick(win, Qt.Key.Key_Escape)


def test_shortcut_esc_chiude_solo_primo_toast(qtbot, win) -> None:
    """Esc chiude solo il primo toast visibile, non tutti."""
    t1 = Toast("Toast 1", parent=win.centralWidget(), duration=10_000)
    t2 = Toast("Toast 2", parent=win.centralWidget(), duration=10_000)
    qtbot.addWidget(t1)
    qtbot.addWidget(t2)

    from PyQt6.QtCore import Qt
    qtbot.keyClick(win, Qt.Key.Key_Escape)

    # Almeno uno è chiuso
    closed = sum(1 for t in (t1, t2) if not t.isVisible())
    assert closed == 1, "Esc deve chiudere un solo toast per volta"
