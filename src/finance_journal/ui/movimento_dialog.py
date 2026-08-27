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
    QInputDialog,
    QLineEdit,
    QRadioButton,
    QWidget,
)

from finance_journal.models.categoria import Categoria
from finance_journal.models.dettaglio import Dettaglio
from finance_journal.models.enums import TipoMovimento
from finance_journal.models.metodo_pagamento import MetodoPagamento
from finance_journal.models.movimento import Movimento
from finance_journal.repositories.categoria import CategoriaRepository
from finance_journal.repositories.metodo_pagamento import MetodoPagamentoRepository

_SENTINEL = "__new__"


class MovimentoDialog(QDialog):
    def __init__(
        self,
        categorie: list[Categoria],
        metodi: list[MetodoPagamento],
        dettagli: list[Dettaglio] | None = None,
        cat_repo: CategoriaRepository | None = None,
        met_repo: MetodoPagamentoRepository | None = None,
        movimento: Movimento | None = None,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._cat_repo = cat_repo
        self._met_repo = met_repo
        self._dettagli = dettagli or []
        self._cat_override = False
        edit_mode = movimento is not None

        self.setWindowTitle("Modifica Movimento" if edit_mode else "Aggiungi Movimento")
        self.setModal(True)
        self.setMinimumWidth(380)

        form = QFormLayout(self)

        # Data
        self._data_edit = QDateEdit()
        self._data_edit.setCalendarPopup(True)
        if edit_mode:
            d = movimento.data
            self._data_edit.setDate(QDate(d.year, d.month, d.day))
        else:
            self._data_edit.setDate(QDate.currentDate())
        form.addRow("Data:", self._data_edit)

        # Tipo
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

        # Importo
        self._importo_spin = QDoubleSpinBox()
        self._importo_spin.setMinimum(0.01)
        self._importo_spin.setMaximum(999_999.99)
        self._importo_spin.setDecimals(2)
        self._importo_spin.setValue(movimento.importo if edit_mode else 0.01)
        form.addRow("Importo:", self._importo_spin)

        # Dettaglio — campo primario
        self._det_combo = QComboBox()
        self._det_combo.addItem("—", None)
        for d in self._dettagli:
            self._det_combo.addItem(d.nome, d.id)
        if edit_mode and movimento.dettaglio_id is not None:
            idx = self._det_combo.findData(movimento.dettaglio_id)
            self._det_combo.setCurrentIndex(max(0, idx))
        # else rimane index 0 ("—")
        form.addRow("Dettaglio:", self._det_combo)

        # Categoria — sempre visibile, derivata, stile muted
        self._prev_cat_idx = 0
        self._cat_combo = QComboBox()
        for c in categorie:
            self._cat_combo.addItem(c.nome, c.id)
        if cat_repo is not None:
            self._cat_combo.addItem("Nuova categoria…", _SENTINEL)
        self._cat_combo.setStyleSheet("color: gray;")

        if edit_mode:
            # Pre-seleziona categoria salvata sul Movimento
            idx = next((i for i, c in enumerate(categorie) if c.id == movimento.categoria_id), 0)
            self._cat_combo.setCurrentIndex(idx)
            self._prev_cat_idx = idx
        # else: cat rimane index 0; _on_det_changed autofill dopo connect

        self._cat_combo.currentIndexChanged.connect(self._on_cat_idx_changed)
        self._cat_combo.activated.connect(self._on_cat_activated)
        form.addRow("Categoria:", self._cat_combo)

        # Connette dettaglio DOPO cat_combo pronto
        self._det_combo.currentIndexChanged.connect(self._on_det_changed)
        # In modalità aggiungi: autofill iniziale se non "—"
        if not edit_mode:
            self._autofill_categoria()

        # Metodo
        self._prev_met_idx = 0
        self._met_combo = QComboBox()
        for m in metodi:
            self._met_combo.addItem(m.nome, m.id)
        if met_repo is not None:
            self._met_combo.addItem("Nuovo metodo…", _SENTINEL)
        if edit_mode:
            idx = next((i for i, m in enumerate(metodi) if m.id == movimento.metodo_id), 0)
            self._met_combo.setCurrentIndex(idx)
            self._prev_met_idx = idx
        self._met_combo.currentIndexChanged.connect(self._on_met_idx_changed)
        self._met_combo.activated.connect(self._on_met_activated)
        form.addRow("Metodo:", self._met_combo)

        # Nota
        self._nota_edit = QLineEdit()
        self._nota_edit.setPlaceholderText("Opzionale")
        if edit_mode:
            self._nota_edit.setText(movimento.nota or "")
        form.addRow("Nota:", self._nota_edit)

        # Pulsanti
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Save
            | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        form.addRow(buttons)

    def _autofill_categoria(self) -> None:
        """Aggiorna categoria dalla categoria del Dettaglio selezionato, se non override manuale."""
        if self._cat_override:
            return
        det_id = self._det_combo.currentData()
        if det_id is None:
            return
        det = next((d for d in self._dettagli if d.id == det_id), None)
        if det is None:
            return
        cat_idx = self._cat_combo.findData(det.categoria_id)
        if cat_idx >= 0:
            self._cat_combo.setCurrentIndex(cat_idx)
            self._prev_cat_idx = cat_idx

    def _on_det_changed(self, _idx: int) -> None:
        """Cambio Dettaglio: resetta override e autofill categoria."""
        self._cat_override = False
        self._autofill_categoria()

    def _on_cat_idx_changed(self, idx: int) -> None:
        if self._cat_combo.itemData(idx) != _SENTINEL:
            self._prev_cat_idx = idx

    def _on_cat_activated(self, idx: int) -> None:
        """Selezione manuale categoria: imposta override o crea nuova categoria."""
        if self._cat_combo.itemData(idx) == _SENTINEL:
            if self._cat_repo is None:
                return
            nome, ok = QInputDialog.getText(self, "Nuova categoria", "Nome:")
            if not ok or not nome.strip():
                self._cat_combo.setCurrentIndex(self._prev_cat_idx)
                return
            cat = self._cat_repo.create(nome.strip())
            sentinel_idx = self._cat_combo.count() - 1
            self._cat_combo.insertItem(sentinel_idx, cat.nome, cat.id)
            self._cat_combo.setCurrentIndex(sentinel_idx)
        # Qualsiasi selezione confermata (categoria esistente o nuova) è override manuale
        self._cat_override = True

    def _on_met_idx_changed(self, idx: int) -> None:
        if self._met_combo.itemData(idx) != _SENTINEL:
            self._prev_met_idx = idx

    def _on_met_activated(self, idx: int) -> None:
        if self._met_combo.itemData(idx) != _SENTINEL or self._met_repo is None:
            return
        nome, ok = QInputDialog.getText(self, "Nuovo metodo di pagamento", "Nome:")
        if not ok or not nome.strip():
            self._met_combo.setCurrentIndex(self._prev_met_idx)
            return
        met = self._met_repo.create(nome.strip())
        sentinel_idx = self._met_combo.count() - 1
        self._met_combo.insertItem(sentinel_idx, met.nome, met.id)
        self._met_combo.setCurrentIndex(sentinel_idx)

    def get_data(self) -> dict:
        qdate = self._data_edit.date()
        return {
            "data": date(qdate.year(), qdate.month(), qdate.day()),
            "tipo": "entrata" if self._rb_entrata.isChecked() else "uscita",
            "importo": self._importo_spin.value(),
            "dettaglio_id": self._det_combo.currentData(),
            "categoria_id": self._cat_combo.currentData(),
            "metodo_id": self._met_combo.currentData(),
            "nota": self._nota_edit.text().strip(),
        }
