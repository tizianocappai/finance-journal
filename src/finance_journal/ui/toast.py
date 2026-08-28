from __future__ import annotations

from typing import Callable

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtWidgets import QFrame, QHBoxLayout, QLabel, QPushButton, QWidget


class Toast(QFrame):
    """Overlay non-modale con auto-dismiss e undo opzionale."""

    def __init__(
        self,
        message: str,
        parent: QWidget,
        duration: int = 3500,
        undo_callback: Callable[[], None] | None = None,
    ) -> None:
        super().__init__(parent)
        self.setObjectName("toast")
        self.setFrameShape(QFrame.Shape.StyledPanel)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(14, 10, 14, 10)
        layout.setSpacing(10)

        lbl = QLabel(message)
        lbl.setWordWrap(False)
        layout.addWidget(lbl)
        layout.addStretch()

        if undo_callback is not None:
            btn_undo = QPushButton("Annulla")
            btn_undo.setFlat(True)
            btn_undo.setCursor(Qt.CursorShape.PointingHandCursor)
            btn_undo.clicked.connect(lambda: self._on_undo(undo_callback))
            layout.addWidget(btn_undo)

        btn_close = QPushButton("✕")
        btn_close.setFlat(True)
        btn_close.setFixedWidth(28)
        btn_close.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_close.clicked.connect(self.close)
        layout.addWidget(btn_close)

        self._timer = QTimer(self)
        self._timer.setSingleShot(True)
        self._timer.timeout.connect(self.close)
        self._timer.start(duration)

        self._position()
        self.raise_()
        self.show()

    def _on_undo(self, callback: Callable[[], None]) -> None:
        self._timer.stop()
        callback()
        self.close()

    def _position(self) -> None:
        p = self.parent()
        if p is None:
            return
        self.adjustSize()
        pw, ph = p.width(), p.height()
        w = min(max(pw - 40, 200), 520)
        self.setFixedWidth(w)
        self.adjustSize()
        h = self.sizeHint().height()
        self.move((pw - w) // 2, ph - h - 24)

    def keyPressEvent(self, event) -> None:
        if event.key() == Qt.Key.Key_Escape:
            self.close()
        else:
            super().keyPressEvent(event)
