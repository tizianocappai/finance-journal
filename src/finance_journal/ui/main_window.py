from __future__ import annotations

from pathlib import Path

from PyQt6.QtWidgets import QFileDialog, QHBoxLayout, QMainWindow, QMessageBox, QWidget

from finance_journal.db.connection import create_connection
from finance_journal.export import export_csv, export_json
from finance_journal.ui.import_dialogs import run_import_csv_flow
from finance_journal.ui.dashboard import DashboardWidget
from finance_journal.ui.impostazioni import ImpostazioniWidget
from finance_journal.ui.movimenti import MovimentiWidget
from finance_journal.ui.placeholder import PlaceholderWidget
from finance_journal.ui.sidebar import Sidebar


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("No Budget")
        self.setMinimumSize(900, 600)

        self._conn = create_connection()

        menu_bar = self.menuBar()
        file_menu = menu_bar.addMenu("File")
        act_importa = file_menu.addAction("Importa CSV…")
        act_importa.triggered.connect(self._importa_csv)
        file_menu.addSeparator()
        act_csv = file_menu.addAction("Esporta come CSV…")
        act_csv.triggered.connect(self._esporta_csv)
        act_json = file_menu.addAction("Esporta come JSON…")
        act_json.triggered.connect(self._esporta_json)

        central = QWidget()
        self.setCentralWidget(central)

        layout = QHBoxLayout(central)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        self._sidebar = Sidebar()
        self._sidebar.section_changed.connect(self._on_section_changed)
        layout.addWidget(self._sidebar)

        self._dashboard = DashboardWidget(self._conn)
        self._movimenti = MovimentiWidget(self._conn)
        self._impostazioni = ImpostazioniWidget(self._conn)

        self._movimenti.dati_modificati.connect(self._dashboard.refresh)
        self._impostazioni.impostazioni_cambiate.connect(self._dashboard.refresh)
        self._impostazioni.impostazioni_cambiate.connect(self._movimenti.refresh)

        self._named_views: dict[str, QWidget] = {
            "Dashboard": self._dashboard,
            "Movimenti": self._movimenti,
            "Impostazioni": self._impostazioni,
        }
        for v in self._named_views.values():
            v.hide()

        self._current: QWidget = self._dashboard
        self._dashboard.show()
        layout.addWidget(self._dashboard, stretch=1)

    def _importa_csv(self) -> None:
        if run_import_csv_flow(self._conn, self):
            self._movimenti.refresh()
            self._dashboard.refresh()

    def _esporta_csv(self) -> None:
        path, _ = QFileDialog.getSaveFileName(
            self, "Esporta come CSV", str(Path.home() / "movimenti.csv"), "CSV (*.csv)"
        )
        if not path:
            return
        export_csv(self._conn, Path(path))
        QMessageBox.information(self, "Export completato", f"File salvato in:\n{path}")

    def _esporta_json(self) -> None:
        path, _ = QFileDialog.getSaveFileName(
            self, "Esporta come JSON", str(Path.home() / "movimenti.json"), "JSON (*.json)"
        )
        if not path:
            return
        export_json(self._conn, Path(path))
        QMessageBox.information(self, "Export completato", f"File salvato in:\n{path}")

    def _on_section_changed(self, section: str) -> None:
        layout = self.centralWidget().layout()
        layout.removeWidget(self._current)
        old = self._current
        if old not in self._named_views.values():
            old.deleteLater()
        else:
            old.hide()

        if section in self._named_views:
            new_widget: QWidget = self._named_views[section]
        else:
            new_widget = PlaceholderWidget(section)

        if hasattr(new_widget, "refresh"):
            new_widget.refresh()  # type: ignore[union-attr]

        new_widget.show()
        layout.addWidget(new_widget, stretch=1)
        self._current = new_widget
