"""Test componente Toast con pytest-qt."""
from __future__ import annotations

import pytest
from PyQt6.QtWidgets import QWidget

from finance_journal.ui.toast import Toast


@pytest.fixture
def parent_widget(qtbot):
    w = QWidget()
    w.resize(800, 600)
    qtbot.addWidget(w)
    w.show()
    return w


def test_toast_is_visible_immediately(qtbot, parent_widget: QWidget) -> None:
    toast = Toast("Test messaggio", parent=parent_widget)
    qtbot.addWidget(toast)
    assert toast.isVisible()


def test_toast_closes_after_duration(qtbot, parent_widget: QWidget) -> None:
    toast = Toast("Auto-chiusura", parent=parent_widget, duration=200)
    qtbot.addWidget(toast)
    assert toast.isVisible()
    qtbot.waitUntil(lambda: not toast.isVisible(), timeout=1000)


def test_toast_undo_callback_called(qtbot, parent_widget: QWidget) -> None:
    called = []
    toast = Toast("Con undo", parent=parent_widget, undo_callback=lambda: called.append(True))
    qtbot.addWidget(toast)

    # Trova il pulsante Annulla e cliccalo
    from PyQt6.QtWidgets import QPushButton
    undo_btns = [
        b for b in toast.findChildren(QPushButton)
        if b.text() == "Annulla"
    ]
    assert undo_btns, "Pulsante Annulla non trovato nel Toast"
    undo_btns[0].click()

    assert called == [True]
    qtbot.waitUntil(lambda: not toast.isVisible(), timeout=500)


def test_toast_close_button_closes(qtbot, parent_widget: QWidget) -> None:
    toast = Toast("Chiudi manuale", parent=parent_widget, duration=5000)
    qtbot.addWidget(toast)

    from PyQt6.QtWidgets import QPushButton
    close_btn = next(
        (b for b in toast.findChildren(QPushButton) if "✕" in b.text()), None
    )
    assert close_btn is not None
    close_btn.click()
    qtbot.waitUntil(lambda: not toast.isVisible(), timeout=500)


def test_toast_esc_closes(qtbot, parent_widget: QWidget) -> None:
    toast = Toast("ESC test", parent=parent_widget, duration=5000)
    qtbot.addWidget(toast)
    qtbot.keyClick(toast, __import__("PyQt6.QtCore", fromlist=["Qt"]).Qt.Key.Key_Escape)
    qtbot.waitUntil(lambda: not toast.isVisible(), timeout=500)


def test_toast_without_undo_has_no_undo_button(qtbot, parent_widget: QWidget) -> None:
    toast = Toast("Senza undo", parent=parent_widget, duration=5000)
    qtbot.addWidget(toast)
    from PyQt6.QtWidgets import QPushButton
    undo_btns = [b for b in toast.findChildren(QPushButton) if b.text() == "Annulla"]
    assert not undo_btns
