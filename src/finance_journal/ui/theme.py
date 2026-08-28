from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Palette:
    background: str
    surface: str
    primary: str
    accent: str
    text: str
    muted: str
    border: str
    success: str
    danger: str
    warning: str
    sidebar_bg: str
    sidebar_active: str
    sidebar_hover: str
    kpi_entrate_bg: str
    kpi_uscite_bg: str
    kpi_saldo_bg: str
    chart_entrate: str
    chart_uscite: str
    chart_saldo: str
    chart_precedente: str


_LIGHT = Palette(
    background="#f5f5f5",
    surface="#ffffff",
    primary="#1565c0",
    accent="#0d47a1",
    text="#1a1a1a",
    muted="#595959",
    border="#d6d6d6",
    success="#1b5e20",
    danger="#b71c1c",
    warning="#e65100",
    sidebar_bg="#ececec",
    sidebar_active="#1565c0",
    sidebar_hover="#dcdcdc",
    kpi_entrate_bg="#e8f5e9",
    kpi_uscite_bg="#ffebee",
    kpi_saldo_bg="#e3f2fd",
    chart_entrate="#388e3c",
    chart_uscite="#d32f2f",
    chart_saldo="#1565c0",
    chart_precedente="#9e9e9e",
)

_DARK = Palette(
    background="#1e1e1e",
    surface="#2b2b2b",
    primary="#42a5f5",
    accent="#90caf9",
    text="#f0f0f0",
    muted="#bdbdbd",
    border="#424242",
    success="#66bb6a",
    danger="#ef5350",
    warning="#ffa726",
    sidebar_bg="#252525",
    sidebar_active="#42a5f5",
    sidebar_hover="#333333",
    kpi_entrate_bg="#1b3a1c",
    kpi_uscite_bg="#3a1b1b",
    kpi_saldo_bg="#1a2a3a",
    chart_entrate="#66bb6a",
    chart_uscite="#ef5350",
    chart_saldo="#42a5f5",
    chart_precedente="#757575",
)

SPACING_XS = 4
SPACING_SM = 8
SPACING_MD = 16
SPACING_LG = 24
RADIUS_SM = 4
RADIUS_MD = 8

FONT_XS = "10px"
FONT_SM = "11px"
FONT_MD = "13px"
FONT_LG = "15px"
FONT_XL = "18px"
FONT_2XL = "22px"

_tema_corrente: str = "sistema"


def set_tema(tema: str) -> None:
    global _tema_corrente
    _tema_corrente = tema


def current_palette() -> Palette:
    return get_palette(_tema_corrente)


def get_palette(tema: str) -> Palette:
    return _DARK if tema == "scuro" else _LIGHT


def _build_stylesheet(p: Palette) -> str:
    return f"""
QWidget {{
    background-color: {p.background};
    color: {p.text};
    font-size: {FONT_MD};
}}
QMainWindow, QDialog {{
    background-color: {p.background};
}}
QScrollArea, QAbstractScrollArea {{
    background-color: transparent;
    border: none;
}}
QLineEdit, QComboBox, QSpinBox, QDoubleSpinBox, QDateEdit {{
    background-color: {p.surface};
    color: {p.text};
    border: 1px solid {p.border};
    border-radius: {RADIUS_SM}px;
    padding: 4px 6px;
    min-height: 22px;
}}
QLineEdit:focus, QComboBox:focus, QSpinBox:focus,
QDoubleSpinBox:focus, QDateEdit:focus {{
    border: 1px solid {p.primary};
}}
QLineEdit[invalid="true"],
QComboBox[invalid="true"],
QDoubleSpinBox[invalid="true"],
QSpinBox[invalid="true"] {{
    border: 1px solid {p.danger};
}}
QPushButton {{
    background-color: {p.surface};
    color: {p.text};
    border: 1px solid {p.border};
    border-radius: {RADIUS_SM}px;
    padding: 5px 12px;
    min-height: 22px;
}}
QPushButton:hover {{
    background-color: {p.sidebar_hover};
    border-color: {p.muted};
}}
QPushButton:pressed {{
    background-color: {p.border};
}}
QPushButton[danger="true"] {{
    color: {p.danger};
    border-color: {p.danger};
}}
QPushButton[danger="true"]:hover {{
    background-color: {p.kpi_uscite_bg};
}}
QPushButton:flat {{
    background-color: transparent;
    border: none;
}}
QPushButton:flat:hover {{
    background-color: {p.sidebar_hover};
}}
QGroupBox {{
    color: {p.text};
    border: 1px solid {p.border};
    border-radius: {RADIUS_SM}px;
    margin-top: 10px;
    padding-top: 6px;
}}
QGroupBox::title {{
    subcontrol-origin: margin;
    left: 10px;
    color: {p.muted};
    font-size: {FONT_SM};
}}
QTableWidget {{
    background-color: {p.surface};
    alternate-background-color: {p.background};
    gridline-color: {p.border};
    border: 1px solid {p.border};
    border-radius: {RADIUS_SM}px;
}}
QTableWidget::item {{
    padding: 4px 6px;
}}
QHeaderView::section {{
    background-color: {p.background};
    color: {p.muted};
    border: none;
    border-bottom: 1px solid {p.border};
    padding: 4px 6px;
    font-size: {FONT_SM};
}}
QComboBox::drop-down {{
    border: none;
    width: 18px;
}}
QComboBox QAbstractItemView {{
    background-color: {p.surface};
    border: 1px solid {p.border};
    selection-background-color: {p.primary};
    selection-color: white;
}}
QLabel {{
    background-color: transparent;
}}
QMenuBar {{
    background-color: {p.background};
    color: {p.text};
    border-bottom: 1px solid {p.border};
}}
QMenuBar::item:selected {{
    background-color: {p.sidebar_hover};
    border-radius: {RADIUS_SM}px;
}}
QMenu {{
    background-color: {p.surface};
    color: {p.text};
    border: 1px solid {p.border};
    border-radius: {RADIUS_SM}px;
}}
QMenu::item:selected {{
    background-color: {p.primary};
    color: white;
}}
QScrollBar:vertical {{
    background: {p.background};
    width: 8px;
    margin: 0;
}}
QScrollBar::handle:vertical {{
    background: {p.border};
    border-radius: 4px;
    min-height: 24px;
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
    height: 0;
}}
QScrollBar:horizontal {{
    background: {p.background};
    height: 8px;
    margin: 0;
}}
QScrollBar::handle:horizontal {{
    background: {p.border};
    border-radius: 4px;
    min-width: 24px;
}}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{
    width: 0;
}}
QListWidget {{
    background-color: {p.surface};
    border: 1px solid {p.border};
    border-radius: {RADIUS_SM}px;
}}
QListWidget::item:selected {{
    background-color: {p.primary};
    color: white;
}}
QRadioButton {{
    background-color: transparent;
}}
QDialog {{
    border-radius: {RADIUS_MD}px;
}}
QFrame#sidebar {{
    background-color: {p.sidebar_bg};
    border-right: 1px solid {p.border};
}}
QFrame#toast {{
    background-color: {p.surface};
    border: 1px solid {p.border};
    border-radius: {RADIUS_MD}px;
}}
QCalendarWidget QAbstractItemView {{
    background-color: {p.surface};
    color: {p.text};
    selection-background-color: {p.primary};
    selection-color: white;
    alternate-background-color: {p.background};
}}
QCalendarWidget QAbstractItemView:disabled {{
    color: {p.muted};
}}
QCalendarWidget QWidget#qt_calendar_navigationbar {{
    background-color: {p.background};
    color: {p.text};
}}
QCalendarWidget QToolButton {{
    background-color: transparent;
    color: {p.text};
    border: none;
}}
QCalendarWidget QToolButton:hover {{
    background-color: {p.sidebar_hover};
    border-radius: {RADIUS_SM}px;
}}
QCalendarWidget QSpinBox {{
    background-color: {p.surface};
    color: {p.text};
    border: 1px solid {p.border};
}}
"""


def light_stylesheet() -> str:
    return _build_stylesheet(_LIGHT)


def dark_stylesheet() -> str:
    return _build_stylesheet(_DARK)


def get_stylesheet(tema: str) -> str:
    if tema == "scuro":
        return dark_stylesheet()
    if tema == "chiaro":
        return light_stylesheet()
    return ""


def relative_luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))

    def _lin(c: float) -> float:
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast_ratio(hex1: str, hex2: str) -> float:
    l1 = relative_luminance(hex1)
    l2 = relative_luminance(hex2)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
