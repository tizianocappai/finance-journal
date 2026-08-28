"""Test widget Sidebar con pytest-qt."""
from __future__ import annotations

import pytest

from finance_journal.ui.sidebar import Sidebar


@pytest.fixture
def sidebar(qtbot):
    w = Sidebar()
    qtbot.addWidget(w)
    w.show()
    return w


def test_sidebar_default_active_is_dashboard(sidebar: Sidebar) -> None:
    assert sidebar.active_section() == "Dashboard"


def test_sidebar_set_active_section_public(sidebar: Sidebar) -> None:
    sidebar.set_active_section("Movimenti")
    assert sidebar.active_section() == "Movimenti"


def test_sidebar_click_movimenti_sets_active(qtbot, sidebar: Sidebar) -> None:
    with qtbot.waitSignal(sidebar.section_changed, timeout=1000) as blocker:
        sidebar._btn_movimenti.click()
    assert blocker.args == ["Movimenti"]
    assert sidebar.active_section() == "Movimenti"


def test_sidebar_click_impostazioni_sets_active(qtbot, sidebar: Sidebar) -> None:
    with qtbot.waitSignal(sidebar.section_changed, timeout=1000):
        sidebar._btn_impostazioni.click()
    assert sidebar.active_section() == "Impostazioni"


def test_sidebar_active_button_is_bold(sidebar: Sidebar) -> None:
    sidebar._btn_dashboard.click()
    assert sidebar._btn_dashboard.is_active()
    assert not sidebar._btn_movimenti.is_active()


def test_sidebar_only_one_active_at_time(qtbot, sidebar: Sidebar) -> None:
    with qtbot.waitSignal(sidebar.section_changed, timeout=1000):
        sidebar._btn_movimenti.click()
    active = [b for b in sidebar._nav_buttons if b.is_active()]
    assert len(active) == 1
    assert active[0].section() == "Movimenti"
