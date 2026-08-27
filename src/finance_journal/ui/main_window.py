from PyQt6.QtWidgets import QHBoxLayout, QMainWindow, QWidget

from finance_journal.ui.placeholder import PlaceholderWidget
from finance_journal.ui.sidebar import Sidebar


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Finance Journal")
        self.setMinimumSize(900, 600)

        central = QWidget()
        self.setCentralWidget(central)

        layout = QHBoxLayout(central)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        self._sidebar = Sidebar()
        self._sidebar.section_changed.connect(self._on_section_changed)
        layout.addWidget(self._sidebar)

        # Default view
        self._content = PlaceholderWidget("Dashboard")
        layout.addWidget(self._content, stretch=1)

    def _on_section_changed(self, section: str) -> None:
        layout = self.centralWidget().layout()
        # Remove old content widget (index 1)
        old = layout.takeAt(1)
        if old and old.widget():
            old.widget().deleteLater()
        new_widget = PlaceholderWidget(section)
        layout.addWidget(new_widget, stretch=1)
        self._content = new_widget
