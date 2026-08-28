from PyQt6.QtCore import pyqtSignal
from PyQt6.QtWidgets import (
    QLabel,
    QPushButton,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)


class Sidebar(QWidget):
    section_changed = pyqtSignal(str)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedWidth(200)
        self.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Expanding)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Header
        header = QLabel("No Budget")
        header.setStyleSheet(
            "font-weight: bold; font-size: 14px; padding: 16px 12px;"
            "border-bottom: 1px solid #cccccc;"
        )
        layout.addWidget(header)

        # Personale group label
        personale_label = QLabel("▼ Resoconto Personale")
        personale_label.setStyleSheet(
            "font-weight: bold; padding: 10px 12px 4px 12px; color: #555555;"
        )
        layout.addWidget(personale_label)

        # Dashboard
        self._btn_dashboard = self._make_button("    Dashboard", "Dashboard")
        layout.addWidget(self._btn_dashboard)

        # Movimenti
        self._btn_movimenti = self._make_button("    Movimenti", "Movimenti")
        layout.addWidget(self._btn_movimenti)

        # Casa (disabled)
        btn_casa = QPushButton("Casa")
        btn_casa.setEnabled(False)
        btn_casa.setFlat(True)
        btn_casa.setStyleSheet(
            "text-align: left; padding: 10px 12px; color: #aaaaaa;"
            "border: none; border-top: 1px solid #e0e0e0;"
        )
        layout.addWidget(btn_casa)

        # Impostazioni
        self._btn_impostazioni = self._make_button("Impostazioni", "Impostazioni")
        self._btn_impostazioni.setStyleSheet(
            self._btn_impostazioni.styleSheet()
            + "border-top: 1px solid #e0e0e0;"
        )
        layout.addWidget(self._btn_impostazioni)

        layout.addStretch()

    def _make_button(self, label: str, section: str) -> QPushButton:
        btn = QPushButton(label)
        btn.setFlat(True)
        btn.setStyleSheet(
            "text-align: left; padding: 10px 12px; border: none;"
        )
        btn.clicked.connect(lambda: self.section_changed.emit(section))
        return btn
