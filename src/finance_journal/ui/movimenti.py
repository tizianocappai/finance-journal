from __future__ import annotations

import sqlite3
from datetime import date

from PyQt6.QtCore import pyqtSignal
from PyQt6.QtWidgets import (
    QComboBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QSpinBox,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from finance_journal.models.categoria import Categoria
from finance_journal.models.enums import TipoMovimento
from finance_journal.models.metodo_pagamento import MetodoPagamento
from finance_journal.repositories.categoria import CategoriaRepository
from finance_journal.repositories.impostazioni import ImpostazioniRepository
from finance_journal.repositories.metodo_pagamento import MetodoPagamentoRepository
from finance_journal.repositories.movimento import MovimentoRepository
from finance_journal.ui.movimento_dialog import MovimentoDialog

_SEZIONE = "personale"

_MESI = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]
_COLS = ["Data", "Tipo", "Importo", "Categoria", "Metodo di pagamento", "Nota"]


class MovimentiWidget(QWidget):
    movimento_aggiunto = pyqtSignal()

    def __init__(self, conn: sqlite3.Connection, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._conn = conn
        self._repo_mov = MovimentoRepository(conn)
        self._repo_cat = CategoriaRepository(conn)
        self._repo_met = MetodoPagamentoRepository(conn)
        self._repo_imp = ImpostazioniRepository(conn)
        self._categorie: list[Categoria] = []
        self._metodi: list[MetodoPagamento] = []
        self._categorie_map: dict[int, str] = {}
        self._metodi_map: dict[int, str] = {}
        self._build_ui()
        self._load_table()

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(16, 16, 16, 16)
        root.setSpacing(10)

        filter_row = QHBoxLayout()
        filter_row.setSpacing(6)

        filter_row.addWidget(QLabel("Mese:"))
        self._mese_combo = QComboBox()
        for nome in _MESI:
            self._mese_combo.addItem(nome)
        self._mese_combo.setCurrentIndex(date.today().month - 1)
        self._mese_combo.currentIndexChanged.connect(self._load_table)
        filter_row.addWidget(self._mese_combo)

        filter_row.addWidget(QLabel("Anno:"))
        self._anno_spin = QSpinBox()
        self._anno_spin.setRange(2000, 2100)
        self._anno_spin.setValue(date.today().year)
        self._anno_spin.valueChanged.connect(self._load_table)
        filter_row.addWidget(self._anno_spin)

        filter_row.addWidget(QLabel("Tipo:"))
        self._tipo_combo = QComboBox()
        self._tipo_combo.addItem("Tutti", None)
        self._tipo_combo.addItem("Entrate", "entrata")
        self._tipo_combo.addItem("Uscite", "uscita")
        self._tipo_combo.currentIndexChanged.connect(self._load_table)
        filter_row.addWidget(self._tipo_combo)

        filter_row.addWidget(QLabel("Categoria:"))
        self._cat_filter = QComboBox()
        self._cat_filter.addItem("Tutte", None)
        self._categorie = self._repo_cat.list()
        for c in self._categorie:
            self._cat_filter.addItem(c.nome, c.id)
            self._categorie_map[c.id] = c.nome
        self._cat_filter.currentIndexChanged.connect(self._load_table)
        filter_row.addWidget(self._cat_filter)

        filter_row.addWidget(QLabel("Metodo:"))
        self._met_filter = QComboBox()
        self._met_filter.addItem("Tutti", None)
        self._metodi = self._repo_met.list()
        for m in self._metodi:
            self._met_filter.addItem(m.nome, m.id)
            self._metodi_map[m.id] = m.nome
        self._met_filter.currentIndexChanged.connect(self._load_table)
        filter_row.addWidget(self._met_filter)

        self._search_edit = QLineEdit()
        self._search_edit.setPlaceholderText("Cerca nota…")
        self._search_edit.textChanged.connect(self._load_table)
        filter_row.addWidget(self._search_edit, stretch=1)

        root.addLayout(filter_row)

        self._table = QTableWidget()
        self._table.setColumnCount(len(_COLS))
        self._table.setHorizontalHeaderLabels(_COLS)
        self._table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self._table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self._table.horizontalHeader().setStretchLastSection(True)
        self._table.verticalHeader().setVisible(False)
        root.addWidget(self._table)

        btn_row = QHBoxLayout()
        btn_row.addStretch()
        self._btn_add = QPushButton("Aggiungi Movimento")
        self._btn_add.clicked.connect(self._on_add)
        btn_row.addWidget(self._btn_add)
        root.addLayout(btn_row)

    def refresh(self) -> None:
        self._load_table()

    def _load_table(self) -> None:
        mese = self._mese_combo.currentIndex() + 1
        anno = self._anno_spin.value()
        tipo = self._tipo_combo.currentData()
        cat_id = self._cat_filter.currentData()
        met_id = self._met_filter.currentData()
        testo = self._search_edit.text().strip() or None

        valuta = self._repo_imp.get("valuta", "€") or "€"
        movimenti = self._repo_mov.list(
            sezione=_SEZIONE,
            anno=anno,
            mese=mese,
            tipo=tipo,
            categoria_id=cat_id,
            metodo_id=met_id,
            testo=testo,
        )

        self._table.setRowCount(len(movimenti))
        for row, m in enumerate(movimenti):
            self._table.setItem(row, 0, QTableWidgetItem(m.data.isoformat()))
            tipo_label = "Entrata" if m.tipo == TipoMovimento.ENTRATA else "Uscita"
            self._table.setItem(row, 1, QTableWidgetItem(tipo_label))
            self._table.setItem(row, 2, QTableWidgetItem(f"{valuta} {m.importo:,.2f}"))
            cat_nome = self._categorie_map.get(m.categoria_id, "—")
            self._table.setItem(row, 3, QTableWidgetItem(cat_nome))
            met_nome = self._metodi_map.get(m.metodo_id, "—")
            self._table.setItem(row, 4, QTableWidgetItem(met_nome))
            self._table.setItem(row, 5, QTableWidgetItem(m.nota or ""))

    def _on_add(self) -> None:
        dialog = MovimentoDialog(self._categorie, self._metodi, parent=self)
        if dialog.exec() == MovimentoDialog.DialogCode.Accepted:
            d = dialog.get_data()
            self._repo_mov.create_movimento(
                data=d["data"],
                tipo=d["tipo"],
                importo=d["importo"],
                categoria_id=d["categoria_id"],
                metodo_id=d["metodo_id"],
                sezione=_SEZIONE,
                nota=d["nota"],
            )
            self._load_table()
            self.movimento_aggiunto.emit()
