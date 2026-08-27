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
    QMessageBox,
    QPushButton,
    QRadioButton,
    QWidget,
)

from finance_journal.models.categoria import Categoria
from finance_journal.models.enums import TipoMovimento
from finance_journal.models.metodo_pagamento import MetodoPagamento
from finance_journal.models.movimento import Movimento


class MovimentoDialog(QDialog):
    def __init__(
        self,
        categorie: list[Categoria],
        metodi: list[MetodoPagamento],
        movimento: Movimento | None = None,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._movimento = movimento
        self._deleted = False
        edit_mode = movimento is not None

        self.setWindowTitle("Modifica Movimento" if edit_mode else "Aggiungi Movimento")
        self.setModal(True)
        self.setMinimumWidth(360)

        form = QFormLayout(self)

        self._data_edit = QDateEdit()
        self._data_edit.setCalendarPopup(True)
        if edit_mode:
            d = movimento.data
            self._data_edit.setDate(QDate(d.year, d.month, d.day))
        else:
            self._data_edit.setDate(QDate.currentDate())
        form.addRow("Data:", self._data_edit)

        tipo_widget = QWidget()
        tipo_layout = QHBoxLayout(tipo_widget)
        tipo_layout.setContentsMargins(0, 0, 0, 0)
        self._rb_uscita = QRadioButton("Uscita")
        self._rb_entrata = QRadioButton("Entrata")
        if edit_mode and movimento.tipo == TipoMovimento.ENTRATA:
            self._rb_entrata.setChecked(True)
        else:
            self._rb_uscita.setChecked(True)
        tipo_layout.addWidget(self._rb_uscita)
        tipo_layout.addWidget(self._rb_entrata)
        form.addRow("Tipo:", tipo_widget)

        self._importo_spin = QDoubleSpinBox()
        self._importo_spin.setMinimum(0.01)
        self._importo_spin.setMaximum(999_999.99)
        self._importo_spin.setDecimals(2)
        self._importo_spin.setValue(movimento.importo if edit_mode else 0.01)
        form.addRow("Importo:", self._importo_spin)

        self._cat_combo = QComboBox()
        for c in categorie:
            self._cat_combo.addItem(c.nome, c.id)
        if edit_mode:
            idx = next((i for i, c in enumerate(categorie) if c.id == movimento.categoria_id), 0)
            self._cat_combo.setCurrentIndex(idx)
        form.addRow("Categoria:", self._cat_combo)

        self._met_combo = QComboBox()
        for m in metodi:
            self._met_combo.addItem(m.nome, m.id)
        if edit_mode:
            idx = next((i for i, m in enumerate(metodi) if m.id == movimento.metodo_id), 0)
            self._met_combo.setCurrentIndex(idx)
        form.addRow("Metodo:", self._met_combo)

        self._nota_edit = QLineEdit()
        self._nota_edit.setPlaceholderText("Opzionale")
        if edit_mode:
            self._nota_edit.setText(movimento.nota or "")
        form.addRow("Nota:", self._nota_edit)

        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Save
            | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)

        if edit_mode:
            btn_elimina = QPushButton("Elimina")
            btn_elimina.setStyleSheet("color: #c62828;")
            btn_elimina.clicked.connect(self._on_elimina)
            buttons.addButton(btn_elimina, QDialogButtonBox.ButtonRole.DestructiveRole)

        form.addRow(buttons)

    def _on_elimina(self) -> None:
        risposta = QMessageBox.question(
            self,
            "Conferma eliminazione",
            "Sei sicuro di voler eliminare questo Movimento?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if risposta == QMessageBox.StandardButton.Yes:
            self._deleted = True
            self.accept()

    def is_deleted(self) -> bool:
        return self._deleted

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
