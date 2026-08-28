from __future__ import annotations

from datetime import date

from PyQt6.QtCore import QDate, Qt
from PyQt6.QtWidgets import (
    QComboBox,
    QDateEdit,
    QDialog,
    QDialogButtonBox,
    QDoubleSpinBox,
    QFormLayout,
    QHBoxLayout,
    QInputDialog,
    QLabel,
    QLineEdit,
    QRadioButton,
    QVBoxLayout,
    QWidget,
)

from finance_journal.models.categoria import Categoria
from finance_journal.models.dettaglio import Dettaglio
from finance_journal.models.enums import TipoMovimento
from finance_journal.models.metodo_pagamento import MetodoPagamento
from finance_journal.models.movimento import Movimento
from finance_journal.repositories.categoria import CategoriaRepository
from finance_journal.repositories.metodo_pagamento import MetodoPagamentoRepository
from finance_journal.ui import theme as th

_SENTINEL = "__new__"


def _make_error_label() -> QLabel:
    p = th.current_palette()
    lbl = QLabel("")
    lbl.setVisible(False)
    lbl.setStyleSheet(f"color: {p.danger}; font-size: {th.FONT_XS}; margin-top: 1px;")
    return lbl


def _set_field_invalid(widget: QWidget, invalid: bool) -> None:
    widget.setProperty("invalid", invalid)
    widget.style().unpolish(widget)
    widget.style().polish(widget)


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
        self.setMinimumWidth(400)

        p = th.current_palette()
        self.setStyleSheet(
            f"QDialog {{ background-color: {p.surface}; border-radius: {th.RADIUS_MD}px; }}"
        )

        outer = QVBoxLayout(self)
        outer.setContentsMargins(th.SPACING_LG, th.SPACING_LG, th.SPACING_LG, th.SPACING_MD)
        outer.setSpacing(th.SPACING_SM)

        form = QFormLayout()
        form.setSpacing(th.SPACING_SM)
        form.setLabelAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        outer.addLayout(form)

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
        self._importo_error = _make_error_label()
        form.addRow("Importo:", self._importo_spin)
        form.addRow("", self._importo_error)

        # Dettaglio
        self._det_combo = QComboBox()
        self._det_combo.addItem("—", None)
        for d in self._dettagli:
            self._det_combo.addItem(d.nome, d.id)
        if edit_mode and movimento.dettaglio_id is not None:
            idx = self._det_combo.findData(movimento.dettaglio_id)
            self._det_combo.setCurrentIndex(max(0, idx))
        form.addRow("Dettaglio:", self._det_combo)

        # Categoria
        self._prev_cat_idx = 0
        self._cat_combo = QComboBox()
        for c in categorie:
            self._cat_combo.addItem(c.nome, c.id)
        if cat_repo is not None:
            self._cat_combo.addItem("Nuova categoria…", _SENTINEL)

        self._cat_error = _make_error_label()
        if edit_mode:
            idx = next((i for i, c in enumerate(categorie) if c.id == movimento.categoria_id), 0)
            self._cat_combo.setCurrentIndex(idx)
            self._prev_cat_idx = idx

        self._cat_combo.currentIndexChanged.connect(self._on_cat_idx_changed)
        self._cat_combo.activated.connect(self._on_cat_activated)
        form.addRow("Categoria:", self._cat_combo)
        form.addRow("", self._cat_error)

        # Connette dettaglio DOPO cat_combo pronto
        self._det_combo.currentIndexChanged.connect(self._on_det_changed)
        if not edit_mode:
            self._autofill_categoria()

        # Metodo
        self._prev_met_idx = 0
        self._met_combo = QComboBox()
        for m in metodi:
            self._met_combo.addItem(m.nome, m.id)
        if met_repo is not None:
            self._met_combo.addItem("Nuovo metodo…", _SENTINEL)
        self._met_error = _make_error_label()
        if edit_mode:
            idx = next((i for i, m in enumerate(metodi) if m.id == movimento.metodo_id), 0)
            self._met_combo.setCurrentIndex(idx)
            self._prev_met_idx = idx
        self._met_combo.currentIndexChanged.connect(self._on_met_idx_changed)
        self._met_combo.activated.connect(self._on_met_activated)
        form.addRow("Metodo:", self._met_combo)
        form.addRow("", self._met_error)

        # Validazione su blur — tutti i widget sono ora pronti
        self._importo_spin.editingFinished.connect(self._validate_importo)
        self._cat_combo.currentIndexChanged.connect(
            lambda _: self._validate_categoria() if self._cat_combo.currentData() != _SENTINEL else None
        )
        self._met_combo.currentIndexChanged.connect(
            lambda _: self._validate_metodo() if self._met_combo.currentData() != _SENTINEL else None
        )

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
        buttons.accepted.connect(self._on_accept)
        buttons.rejected.connect(self.reject)
        outer.addWidget(buttons)

    def _autofill_categoria(self) -> None:
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
        self._cat_override = False
        self._autofill_categoria()

    def _on_cat_idx_changed(self, idx: int) -> None:
        if self._cat_combo.itemData(idx) != _SENTINEL:
            self._prev_cat_idx = idx

    def _on_cat_activated(self, idx: int) -> None:
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

    def _validate_importo(self) -> bool:
        invalid = self._importo_spin.value() <= 0
        _set_field_invalid(self._importo_spin, invalid)
        self._importo_error.setText("L'importo deve essere maggiore di zero." if invalid else "")
        self._importo_error.setVisible(invalid)
        return not invalid

    def _validate_categoria(self) -> bool:
        cat_data = self._cat_combo.currentData()
        invalid = cat_data is None or cat_data == _SENTINEL
        _set_field_invalid(self._cat_combo, invalid)
        self._cat_error.setText("Seleziona una categoria." if invalid else "")
        self._cat_error.setVisible(invalid)
        return not invalid

    def _validate_metodo(self) -> bool:
        met_data = self._met_combo.currentData()
        invalid = met_data is None or met_data == _SENTINEL
        _set_field_invalid(self._met_combo, invalid)
        self._met_error.setText("Seleziona un metodo di pagamento." if invalid else "")
        self._met_error.setVisible(invalid)
        return not invalid

    def _validate(self) -> bool:
        results = [
            self._validate_importo(),
            self._validate_categoria(),
            self._validate_metodo(),
        ]
        if not results[0]:
            self._importo_spin.setFocus()
        elif not results[1]:
            self._cat_combo.setFocus()
        elif not results[2]:
            self._met_combo.setFocus()
        return all(results)

    def _on_accept(self) -> None:
        if self._validate():
            self.accept()

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
