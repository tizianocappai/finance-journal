"""Test widget Sidebar con pytest-qt."""
from __future__ import annotations

import pytest

from finance_journal.ui.sidebar import Sidebar, _SidebarButton


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


def test_sidebar_buttons_have_icons(sidebar: Sidebar) -> None:
    for btn in sidebar._nav_buttons:
        assert not btn.icon().isNull(), f"Bottone '{btn.section()}' non ha icona"


def test_sidebar_active_button_icon_differs_from_inactive(qtbot, sidebar: Sidebar) -> None:
    sidebar.set_active_section("Dashboard")
    active_icon = sidebar._btn_dashboard.icon()
    inactive_icon = sidebar._btn_movimenti.icon()
    # Le icone sono generate con colori diversi: le pixmap non possono essere identiche
    px_active = active_icon.pixmap(18, 18)
    px_inactive = inactive_icon.pixmap(18, 18)
    assert px_active.toImage() != px_inactive.toImage(), (
        "L'icona attiva e quella inattiva dovrebbero avere colori diversi"
    )


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
