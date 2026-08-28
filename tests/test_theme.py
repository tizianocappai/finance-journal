"""Test unitari per ui/theme.py — senza dipendenze Qt."""
from __future__ import annotations

import pytest

from finance_journal.ui.theme import (
    Palette,
    _DARK,
    _LIGHT,
    contrast_ratio,
    dark_stylesheet,
    get_palette,
    get_stylesheet,
    light_stylesheet,
    relative_luminance,
)

_REQUIRED_ATTRS = [
    "background", "surface", "primary", "accent", "text", "muted", "border",
    "success", "danger", "warning",
    "sidebar_bg", "sidebar_active", "sidebar_hover",
    "kpi_entrate_bg", "kpi_uscite_bg", "kpi_saldo_bg",
    "chart_entrate", "chart_uscite", "chart_saldo", "chart_precedente",
]


@pytest.mark.parametrize("palette", [_LIGHT, _DARK])
def test_palette_has_all_tokens(palette: Palette) -> None:
    for attr in _REQUIRED_ATTRS:
        val = getattr(palette, attr)
        assert val, f"Token '{attr}' è vuoto o assente"
        assert val.startswith("#"), f"Token '{attr}' non è un hex color: {val!r}"


@pytest.mark.parametrize("palette,name", [(_LIGHT, "chiaro"), (_DARK, "scuro")])
def test_get_palette(palette: Palette, name: str) -> None:
    assert get_palette(name) == palette


def test_get_palette_default_is_light() -> None:
    assert get_palette("sistema") == _LIGHT


def test_get_stylesheet_scuro_contains_dark_bg() -> None:
    css = get_stylesheet("scuro")
    assert _DARK.background in css


def test_get_stylesheet_chiaro_contains_light_bg() -> None:
    css = get_stylesheet("chiaro")
    assert _LIGHT.background in css


def test_get_stylesheet_sistema_is_empty() -> None:
    assert get_stylesheet("sistema") == ""


def test_light_stylesheet_is_nonempty() -> None:
    assert len(light_stylesheet()) > 200


def test_dark_stylesheet_is_nonempty() -> None:
    assert len(dark_stylesheet()) > 200


@pytest.mark.parametrize("hex_color,expected_approx", [
    ("#000000", 0.0),
    ("#ffffff", 1.0),
    ("#808080", 0.216),
])
def test_relative_luminance(hex_color: str, expected_approx: float) -> None:
    result = relative_luminance(hex_color)
    assert abs(result - expected_approx) < 0.02, (
        f"Luminanza di {hex_color}: attesa ~{expected_approx}, ottenuta {result:.4f}"
    )


def test_contrast_ratio_black_on_white() -> None:
    cr = contrast_ratio("#000000", "#ffffff")
    assert abs(cr - 21.0) < 0.1


def test_contrast_ratio_is_symmetric() -> None:
    cr1 = contrast_ratio("#1a1a1a", "#f5f5f5")
    cr2 = contrast_ratio("#f5f5f5", "#1a1a1a")
    assert abs(cr1 - cr2) < 0.001


_TEXT_BG_PAIRS_LIGHT = [
    (_LIGHT.text, _LIGHT.background),
    (_LIGHT.text, _LIGHT.surface),
    (_LIGHT.muted, _LIGHT.background),
    (_LIGHT.muted, _LIGHT.surface),
]

_TEXT_BG_PAIRS_DARK = [
    (_DARK.text, _DARK.background),
    (_DARK.text, _DARK.surface),
    (_DARK.muted, _DARK.background),
    (_DARK.muted, _DARK.surface),
]


@pytest.mark.parametrize("text_hex,bg_hex", _TEXT_BG_PAIRS_LIGHT)
def test_light_theme_contrast(text_hex: str, bg_hex: str) -> None:
    cr = contrast_ratio(text_hex, bg_hex)
    assert cr >= 4.5, (
        f"Contrasto insufficiente nel tema chiaro: {text_hex} su {bg_hex} → {cr:.2f} (minimo 4.5:1)"
    )


@pytest.mark.parametrize("text_hex,bg_hex", _TEXT_BG_PAIRS_DARK)
def test_dark_theme_contrast(text_hex: str, bg_hex: str) -> None:
    cr = contrast_ratio(text_hex, bg_hex)
    assert cr >= 4.5, (
        f"Contrasto insufficiente nel tema scuro: {text_hex} su {bg_hex} → {cr:.2f} (minimo 4.5:1)"
    )


def test_chart_colors_contrast_light() -> None:
    for attr in ("chart_entrate", "chart_uscite", "chart_saldo"):
        color = getattr(_LIGHT, attr)
        cr = contrast_ratio(color, _LIGHT.surface)
        assert cr >= 3.0, (
            f"Contrasto grafico insufficiente nel tema chiaro: {attr}={color} su {_LIGHT.surface} → {cr:.2f}"
        )


def test_chart_colors_contrast_dark() -> None:
    for attr in ("chart_entrate", "chart_uscite", "chart_saldo"):
        color = getattr(_DARK, attr)
        cr = contrast_ratio(color, _DARK.surface)
        assert cr >= 3.0, (
            f"Contrasto grafico insufficiente nel tema scuro: {attr}={color} su {_DARK.surface} → {cr:.2f}"
        )


def test_stylesheet_no_hardcoded_hex_not_in_palette() -> None:
    """Tutti gli hex nei CSS devono provenire dalla palette (nessun hex ad-hoc)."""
    import re

    css = light_stylesheet() + dark_stylesheet()
    found_hex = set(re.findall(r"#[0-9a-fA-F]{6}", css))

    all_palette_colors: set[str] = set()
    for p in (_LIGHT, _DARK):
        for attr in _REQUIRED_ATTRS:
            all_palette_colors.add(getattr(p, attr).lower())
    all_palette_colors.add("#ffffff")

    unknown = {h.lower() for h in found_hex} - all_palette_colors
    assert not unknown, f"Hex non provenienti dalla palette: {unknown}"
