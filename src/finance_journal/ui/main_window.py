from __future__ import annotations

from PyQt6.QtWidgets import QHBoxLayout, QMainWindow, QWidget

from finance_journal.db.connection import create_connection
from finance_journal.ui.dashboard import DashboardWidget
from finance_journal.ui.movimenti import MovimentiWidget
from finance_journal.ui.placeholder import PlaceholderWidget
from finance_journal.ui.sidebar import Sidebar


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Finance Journal")
        self.setMinimumSize(900, 600)

        self._conn = create_connection()

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
        self._movimenti.movimento_aggiunto.connect(self._dashboard.refresh)

        self._named_views: dict[str, QWidget] = {
            "Dashboard": self._dashboard,
            "Movimenti": self._movimenti,
        }
        for v in self._named_views.values():
            v.hide()

        self._current: QWidget = self._dashboard
        self._dashboard.show()
        layout.addWidget(self._dashboard, stretch=1)

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
