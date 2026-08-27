from __future__ import annotations

import shutil
import sqlite3
from datetime import date
from pathlib import Path

from PyQt6.QtCore import QDate, pyqtSignal
from PyQt6.QtWidgets import (
    QApplication,
    QComboBox,
    QDateEdit,
    QDoubleSpinBox,
    QFileDialog,
    QFormLayout,
    QFrame,
    QGroupBox,
    QHBoxLayout,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from finance_journal.db.connection import get_db_path
from finance_journal.repositories.impostazioni import ImpostazioniRepository

_TEMA_SCURO = """
QWidget { background-color: #2b2b2b; color: #f0f0f0; }
QLineEdit, QComboBox, QSpinBox, QDoubleSpinBox, QDateEdit {
    background-color: #3c3f41; color: #f0f0f0; border: 1px solid #555;
}
QPushButton {
    background-color: #4c5052; color: #f0f0f0;
    border: 1px solid #666; padding: 4px 8px;
}
QPushButton:hover { background-color: #5c6164; }
QGroupBox { color: #f0f0f0; border: 1px solid #555; margin-top: 6px; }
QGroupBox::title { subcontrol-origin: margin; left: 8px; }
"""

_TEMA_CHIARO = """
QWidget { background-color: #ffffff; color: #000000; }
QLineEdit, QComboBox, QSpinBox, QDoubleSpinBox, QDateEdit {
    background-color: #ffffff; color: #000000; border: 1px solid #ccc;
}
QPushButton { background-color: #f0f0f0; color: #000000; border: 1px solid #bbb; padding: 4px 8px; }
QPushButton:hover { background-color: #e0e0e0; }
QGroupBox { color: #000000; border: 1px solid #ccc; margin-top: 6px; }
QGroupBox::title { subcontrol-origin: margin; left: 8px; }
"""


class ImpostazioniWidget(QWidget):
    impostazioni_cambiate = pyqtSignal()

    def __init__(self, conn: sqlite3.Connection, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._conn = conn
        self._repo = ImpostazioniRepository(conn)
        self._build_ui()
        self._load()

    def _build_ui(self) -> None:
        scroll = QScrollArea(self)
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)

        container = QWidget()
        scroll.setWidget(container)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.addWidget(scroll)

        root = QVBoxLayout(container)
        root.setContentsMargins(24, 24, 24, 24)
        root.setSpacing(16)

        # --- Valuta ---
        grp_valuta = QGroupBox("Valuta")
        form_valuta = QFormLayout(grp_valuta)
        self._simbolo_edit = QLineEdit()
        self._simbolo_edit.setMaxLength(4)
        self._simbolo_edit.setFixedWidth(80)
        form_valuta.addRow("Simbolo:", self._simbolo_edit)
        self._codice_edit = QLineEdit()
        self._codice_edit.setMaxLength(8)
        self._codice_edit.setFixedWidth(80)
        form_valuta.addRow("Codice:", self._codice_edit)
        btn_salva_valuta = QPushButton("Salva valuta")
        btn_salva_valuta.clicked.connect(self._salva_valuta)
        form_valuta.addRow("", btn_salva_valuta)
        root.addWidget(grp_valuta)

        # --- Saldo iniziale ---
        grp_saldo = QGroupBox("Saldo Iniziale (opzionale)")
        form_saldo = QFormLayout(grp_saldo)
        self._saldo_spin = QDoubleSpinBox()
        self._saldo_spin.setMinimum(-9_999_999.99)
        self._saldo_spin.setMaximum(9_999_999.99)
        self._saldo_spin.setDecimals(2)
        form_saldo.addRow("Importo:", self._saldo_spin)
        self._saldo_data_edit = QDateEdit()
        self._saldo_data_edit.setCalendarPopup(True)
        self._saldo_data_edit.setDate(QDate.currentDate())
        form_saldo.addRow("Data riferimento:", self._saldo_data_edit)
        btn_saldo_row = QHBoxLayout()
        btn_salva_saldo = QPushButton("Salva")
        btn_salva_saldo.clicked.connect(self._salva_saldo)
        btn_cancella_saldo = QPushButton("Rimuovi")
        btn_cancella_saldo.clicked.connect(self._cancella_saldo)
        btn_saldo_row.addWidget(btn_salva_saldo)
        btn_saldo_row.addWidget(btn_cancella_saldo)
        form_saldo.addRow("", btn_saldo_row)
        root.addWidget(grp_saldo)

        # --- Tema ---
        grp_tema = QGroupBox("Tema")
        form_tema = QFormLayout(grp_tema)
        self._tema_combo = QComboBox()
        self._tema_combo.addItem("Segui sistema", "sistema")
        self._tema_combo.addItem("Chiaro", "chiaro")
        self._tema_combo.addItem("Scuro", "scuro")
        self._tema_combo.currentIndexChanged.connect(self._on_tema_changed)
        form_tema.addRow("Tema:", self._tema_combo)
        root.addWidget(grp_tema)

        # --- Database ---
        grp_db = QGroupBox("Database")
        form_db = QFormLayout(grp_db)
        self._path_edit = QLineEdit(str(get_db_path()))
        self._path_edit.setReadOnly(True)
        form_db.addRow("Percorso:", self._path_edit)
        btn_export = QPushButton("Esporta database…")
        btn_export.clicked.connect(self._esporta_db)
        form_db.addRow("", btn_export)
        btn_import = QPushButton("Importa database…")
        btn_import.clicked.connect(self._importa_db)
        form_db.addRow("", btn_import)
        root.addWidget(grp_db)

        root.addStretch()

    def _load(self) -> None:
        self._simbolo_edit.setText(self._repo.get("valuta", "€") or "€")
        self._codice_edit.setText(self._repo.get("valuta_codice", "EUR") or "EUR")

        importo, saldo_data = self._repo.get_saldo_iniziale()
        self._saldo_spin.setValue(importo)
        if saldo_data is not None:
            self._saldo_data_edit.setDate(QDate(saldo_data.year, saldo_data.month, saldo_data.day))

        tema = self._repo.get("tema", "sistema") or "sistema"
        idx = self._tema_combo.findData(tema)
        if idx >= 0:
            self._tema_combo.blockSignals(True)
            self._tema_combo.setCurrentIndex(idx)
            self._tema_combo.blockSignals(False)
        _applica_tema_app(tema)

    def _salva_valuta(self) -> None:
        simbolo = self._simbolo_edit.text().strip() or "€"
        codice = self._codice_edit.text().strip() or "EUR"
        self._repo.set("valuta", simbolo)
        self._repo.set("valuta_codice", codice)
        self.impostazioni_cambiate.emit()

    def _salva_saldo(self) -> None:
        importo = self._saldo_spin.value()
        qd = self._saldo_data_edit.date()
        d = date(qd.year(), qd.month(), qd.day())
        self._repo.set("saldo_iniziale_importo", str(importo))
        self._repo.set("saldo_iniziale_data", d.isoformat())
        self.impostazioni_cambiate.emit()

    def _cancella_saldo(self) -> None:
        self._repo.set("saldo_iniziale_importo", "")
        self._repo.set("saldo_iniziale_data", "")
        self._saldo_spin.setValue(0.0)
        self._saldo_data_edit.setDate(QDate.currentDate())
        self.impostazioni_cambiate.emit()

    def _on_tema_changed(self) -> None:
        tema = self._tema_combo.currentData()
        self._repo.set("tema", tema)
        _applica_tema_app(tema)

    def _esporta_db(self) -> None:
        src = get_db_path()
        dst, _ = QFileDialog.getSaveFileName(
            self, "Esporta database", str(Path.home() / "finance.db"), "Database SQLite (*.db)"
        )
        if not dst:
            return
        shutil.copy2(src, dst)
        QMessageBox.information(self, "Export completato", f"Database esportato in:\n{dst}")

    def _importa_db(self) -> None:
        src, _ = QFileDialog.getOpenFileName(
            self, "Importa database", str(Path.home()), "Database SQLite (*.db)"
        )
        if not src:
            return
        risposta = QMessageBox.warning(
            self,
            "Conferma importazione",
            "I dati attuali verranno sostituiti con quelli del file selezionato.\n"
            "Riavvia l'applicazione per applicare il database importato.\n\n"
            "Continuare?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if risposta != QMessageBox.StandardButton.Yes:
            return
        shutil.copy2(src, get_db_path())
        QMessageBox.information(
            self,
            "Import completato",
            "Database importato. Riavvia l'applicazione per applicare le modifiche.",
        )


def _applica_tema_app(tema: str) -> None:
    app = QApplication.instance()
    if app is None:
        return
    if tema == "scuro":
        app.setStyleSheet(_TEMA_SCURO)
    elif tema == "chiaro":
        app.setStyleSheet(_TEMA_CHIARO)
    else:
        app.setStyleSheet("")
