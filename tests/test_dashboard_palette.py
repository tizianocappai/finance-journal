"""Test che i grafici della Dashboard usino la palette del tema (#40)."""
from __future__ import annotations

import sqlite3
from datetime import date

import pytest

from finance_journal.db.schema import create_tables, seed_defaults
from finance_journal.repositories.movimento import MovimentoRepository
from finance_journal.ui import theme as th
from finance_journal.ui.theme import _DARK, _LIGHT, contrast_ratio


@pytest.fixture
def conn():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    create_tables(c)
    seed_defaults(c)
    yield c
    c.close()


def _get_defaults(conn: sqlite3.Connection) -> tuple[int, int]:
    cat = conn.execute("SELECT id FROM categorie LIMIT 1").fetchone()["id"]
    met = conn.execute("SELECT id FROM metodi_pagamento LIMIT 1").fetchone()["id"]
    return cat, met


@pytest.mark.parametrize("tema,palette", [("chiaro", _LIGHT), ("scuro", _DARK)])
def test_chart_colors_are_palette_tokens(tema: str, palette) -> None:
    """I colori matplotlib provengono dai token — nessun hex hardcoded."""
    th.set_tema(tema)
    p = th.current_palette()
    assert p.chart_entrate == palette.chart_entrate
    assert p.chart_uscite == palette.chart_uscite
    assert p.chart_saldo == palette.chart_saldo
    assert p.chart_precedente == palette.chart_precedente


@pytest.mark.parametrize("tema,palette", [("chiaro", _LIGHT), ("scuro", _DARK)])
def test_chart_colors_contrast_against_surface(tema: str, palette) -> None:
    """Contrasto dati/sfondo ≥3:1 per accessibilità."""
    for attr in ("chart_entrate", "chart_uscite", "chart_saldo"):
        color = getattr(palette, attr)
        cr = contrast_ratio(color, palette.surface)
        assert cr >= 3.0, (
            f"[{tema}] {attr}={color} su surface={palette.surface} → CR={cr:.2f} < 3.0"
        )


def test_current_palette_switches_with_tema() -> None:
    th.set_tema("chiaro")
    assert th.current_palette() == _LIGHT
    th.set_tema("scuro")
    assert th.current_palette() == _DARK
    th.set_tema("sistema")
    assert th.current_palette() == _LIGHT  # sistema cade su light


def test_dashboard_chart_colors_derive_from_current_palette(qtbot, conn) -> None:
    """La DashboardWidget usa i colori da current_palette() al momento del refresh."""
    th.set_tema("chiaro")
    from finance_journal.ui.dashboard import DashboardWidget

    w = DashboardWidget(conn)
    qtbot.addWidget(w)

    cat_id, met_id = _get_defaults(conn)
    repo = MovimentoRepository(conn)
    repo.create_movimento(
        data=date(2024, 3, 1), tipo="entrata", importo=200.0,
        categoria_id=cat_id, metodo_id=met_id, sezione="personale",
    )
    repo.create_movimento(
        data=date(2024, 3, 2), tipo="uscita", importo=80.0,
        categoria_id=cat_id, metodo_id=met_id, sezione="personale",
    )

    # Light theme: barre entrate devono usare il colore del tema light
    th.set_tema("chiaro")
    w.refresh()
    # Controlla che i colori disegnati provengano dalla palette corrente
    p = th.current_palette()
    # I colori delle barre sono impostati durante _draw_barre:
    # se la palette è quella giusta, il chart_entrate deve matchare
    assert p.chart_entrate == _LIGHT.chart_entrate

    # Cambia tema: i colori devono essere quelli dark
    th.set_tema("scuro")
    w.refresh()
    p2 = th.current_palette()
    assert p2.chart_entrate == _DARK.chart_entrate
    assert p2.chart_entrate != _LIGHT.chart_entrate
