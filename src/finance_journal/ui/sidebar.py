from __future__ import annotations

from PyQt6.QtCore import pyqtSignal
from PyQt6.QtWidgets import (
    QFrame,
    QLabel,
    QPushButton,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from finance_journal.ui import theme as th


class _SidebarButton(QPushButton):
    def __init__(self, label: str, section: str, parent: QWidget | None = None) -> None:
        super().__init__(label, parent)
        self._section = section
        self.setFlat(True)
        self.setCheckable(False)
        self._set_active(False)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)

    def _set_active(self, active: bool) -> None:
        self._active = active
        self._update_style()

    def _update_style(self) -> None:
        p = th.current_palette()
        if self._active:
            self.setStyleSheet(
                f"text-align: left; padding: 10px 12px 10px 15px; border: none;"
                f" border-left: 3px solid {p.sidebar_active};"
                f" background-color: {p.kpi_saldo_bg};"
                f" font-weight: bold;"
            )
        else:
            self.setStyleSheet(
                f"text-align: left; padding: 10px 12px 10px 18px; border: none;"
                f" background-color: transparent;"
            )

    def section(self) -> str:
        return self._section

    def is_active(self) -> bool:
        return self._active


class Sidebar(QFrame):
    section_changed = pyqtSignal(str)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("sidebar")
        self.setFixedWidth(200)
        self.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Expanding)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        p = th.current_palette()

        header = QLabel("No Budget")
        header.setStyleSheet(
            f"font-weight: bold; font-size: {th.FONT_LG};"
            f" padding: 16px 12px;"
            f" border-bottom: 1px solid {p.border};"
        )
        layout.addWidget(header)

        personale_label = QLabel("Resoconto Personale")
        personale_label.setStyleSheet(
            f"font-weight: bold; font-size: {th.FONT_XS};"
            f" padding: 10px 12px 4px 12px; color: {p.muted};"
            " text-transform: uppercase; letter-spacing: 1px;"
        )
        layout.addWidget(personale_label)

        self._btn_dashboard = _SidebarButton("Dashboard", "Dashboard")
        self._btn_dashboard.clicked.connect(lambda: self._on_clicked("Dashboard"))
        layout.addWidget(self._btn_dashboard)

        self._btn_movimenti = _SidebarButton("Movimenti", "Movimenti")
        self._btn_movimenti.clicked.connect(lambda: self._on_clicked("Movimenti"))
        layout.addWidget(self._btn_movimenti)

        btn_casa = QPushButton("Casa")
        btn_casa.setEnabled(False)
        btn_casa.setFlat(True)
        btn_casa.setStyleSheet(
            f"text-align: left; padding: 10px 12px 10px 18px;"
            f" color: {p.muted}; border: none;"
            f" border-top: 1px solid {p.border};"
        )
        layout.addWidget(btn_casa)

        layout.addStretch()

        self._btn_impostazioni = _SidebarButton("Impostazioni", "Impostazioni")
        self._btn_impostazioni.setStyleSheet(
            self._btn_impostazioni.styleSheet()
            + f" border-top: 1px solid {p.border};"
        )
        self._btn_impostazioni.clicked.connect(lambda: self._on_clicked("Impostazioni"))
        layout.addWidget(self._btn_impostazioni)

        self._nav_buttons: list[_SidebarButton] = [
            self._btn_dashboard,
            self._btn_movimenti,
            self._btn_impostazioni,
        ]
        self.set_active_section("Dashboard")

    def _on_clicked(self, section: str) -> None:
        self.set_active_section(section)
        self.section_changed.emit(section)

    def set_active_section(self, section: str) -> None:
        for btn in self._nav_buttons:
            btn._set_active(btn.section() == section)

    def active_section(self) -> str:
        for btn in self._nav_buttons:
            if btn.is_active():
                return btn.section()
        return ""
