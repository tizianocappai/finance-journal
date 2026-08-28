from __future__ import annotations

import logging
import sqlite3
from pathlib import Path

from PyQt6.QtWidgets import (
    QDialog,
    QDialogButtonBox,
    QFileDialog,
    QLabel,
    QMessageBox,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from finance_journal.import_csv import ImportCSVError, ImportResult, analyse_csv, import_csv

logger = logging.getLogger(__name__)


def _show_new_entities(layout: QVBoxLayout, result: ImportResult) -> None:
    if result.create_categorie:
        layout.addWidget(QLabel(f"<b>Nuove categorie:</b> {', '.join(result.create_categorie)}"))
    if result.create_account:
        layout.addWidget(QLabel(f"<b>Nuovi account:</b> {', '.join(result.create_account)}"))
    if result.create_dettagli:
        layout.addWidget(QLabel(f"<b>Nuovi dettagli:</b> {', '.join(result.create_dettagli)}"))


class ImportPreviewDialog(QDialog):
    def __init__(self, result: ImportResult, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Anteprima import CSV")
        self.setMinimumWidth(400)
        layout = QVBoxLayout(self)

        layout.addWidget(QLabel(f"<b>Righe valide da importare:</b> {result.importati}"))
        if result.importati == 0:
            layout.addWidget(QLabel("Nessuna riga valida trovata nel file CSV."))
        layout.addWidget(QLabel(f"<b>Righe non valide (saltate):</b> {len(result.saltati)}"))
        _show_new_entities(layout, result)

        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        btn_ok = buttons.button(QDialogButtonBox.StandardButton.Ok)
        btn_ok.setText("Importa")
        btn_ok.setEnabled(result.importati > 0)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)


class ImportReportDialog(QDialog):
    def __init__(self, result: ImportResult, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Import completato")
        self.setMinimumWidth(420)
        layout = QVBoxLayout(self)

        layout.addWidget(QLabel(f"<b>Movimenti importati:</b> {result.importati}"))
        layout.addWidget(QLabel(f"<b>Righe saltate:</b> {len(result.saltati)}"))
        _show_new_entities(layout, result)

        if result.saltati:
            layout.addWidget(QLabel("<b>Dettaglio righe saltate:</b>"))
            scroll = QScrollArea()
            scroll.setWidgetResizable(True)
            scroll.setMaximumHeight(150)
            inner = QWidget()
            inner_layout = QVBoxLayout(inner)
            for s in result.saltati:
                inner_layout.addWidget(QLabel(f"Riga {s.numero}: {s.motivo}"))
            scroll.setWidget(inner)
            layout.addWidget(scroll)

        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok)
        buttons.accepted.connect(self.accept)
        layout.addWidget(buttons)


def run_import_csv_flow(conn: sqlite3.Connection, parent: QWidget | None = None) -> bool:
    path, _ = QFileDialog.getOpenFileName(
        parent, "Importa CSV", str(Path.home()), "CSV (*.csv)"
    )
    if not path:
        return False

    try:
        preview = analyse_csv(conn, Path(path))
    except (OSError, ImportCSVError) as e:
        logger.exception("Errore durante l'analisi del CSV: %s", path)
        QMessageBox.critical(parent, "Errore import CSV", str(e))
        return False

    dlg = ImportPreviewDialog(preview, parent)
    if dlg.exec() != QDialog.DialogCode.Accepted:
        return False

    try:
        result = import_csv(conn, Path(path))
    except (OSError, ImportCSVError) as e:
        logger.exception("Errore durante l'import del CSV: %s", path)
        QMessageBox.critical(parent, "Errore import CSV", str(e))
        return False

    ImportReportDialog(result, parent).exec()
    return True
