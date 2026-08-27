from __future__ import annotations

from datetime import date

from PyQt6.QtCore import QDate
from PyQt6.QtWidgets import (
    QComboBox,
    QDateEdit,
    QDialog,
    QDialogButtonBox,
    QDoubleSpinBox,
    QFormLayout,
    QHBoxLayout,
    QLineEdit,
    QRadioButton,
    QWidget,
)

from finance_journal.models.categoria import Categoria
from finance_journal.models.metodo_pagamento import MetodoPagamento


class MovimentoDialog(QDialog):
    def __init__(
        self,
        categorie: list[Categoria],
        metodi: list[MetodoPagamento],
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self.setWindowTitle("Aggiungi Movimento")
        self.setModal(True)
        self.setMinimumWidth(360)

        form = QFormLayout(self)

        self._data_edit = QDateEdit()
        self._data_edit.setCalendarPopup(True)
        self._data_edit.setDate(QDate.currentDate())
        form.addRow("Data:", self._data_edit)

        tipo_widget = QWidget()
        tipo_layout = QHBoxLayout(tipo_widget)
        tipo_layout.setContentsMargins(0, 0, 0, 0)
        self._rb_uscita = QRadioButton("Uscita")
        self._rb_uscita.setChecked(True)
        self._rb_entrata = QRadioButton("Entrata")
        tipo_layout.addWidget(self._rb_uscita)
        tipo_layout.addWidget(self._rb_entrata)
        form.addRow("Tipo:", tipo_widget)

        self._importo_spin = QDoubleSpinBox()
        self._importo_spin.setMinimum(0.01)
        self._importo_spin.setMaximum(999_999.99)
        self._importo_spin.setDecimals(2)
        self._importo_spin.setValue(0.01)
        form.addRow("Importo:", self._importo_spin)

        self._cat_combo = QComboBox()
        for c in categorie:
            self._cat_combo.addItem(c.nome, c.id)
        form.addRow("Categoria:", self._cat_combo)

        self._met_combo = QComboBox()
        for m in metodi:
            self._met_combo.addItem(m.nome, m.id)
        form.addRow("Metodo:", self._met_combo)

        self._nota_edit = QLineEdit()
        self._nota_edit.setPlaceholderText("Opzionale")
        form.addRow("Nota:", self._nota_edit)

        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Save
            | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self._on_save)
        buttons.rejected.connect(self.reject)
        form.addRow(buttons)

    def _on_save(self) -> None:
        self.accept()

    def get_data(self) -> dict:
        qdate = self._data_edit.date()
        return {
            "data": date(qdate.year(), qdate.month(), qdate.day()),
            "tipo": "entrata" if self._rb_entrata.isChecked() else "uscita",
            "importo": self._importo_spin.value(),
            "categoria_id": self._cat_combo.currentData(),
            "metodo_id": self._met_combo.currentData(),
            "nota": self._nota_edit.text().strip(),
        }
