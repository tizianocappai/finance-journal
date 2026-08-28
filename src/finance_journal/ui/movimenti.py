from __future__ import annotations

import logging
import sqlite3
from collections.abc import Callable
from datetime import date

from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtWidgets import (
    QComboBox,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QSizePolicy,
    QStackedWidget,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from finance_journal.models.categoria import Categoria
from finance_journal.models.dettaglio import Dettaglio
from finance_journal.models.enums import TipoMovimento
from finance_journal.models.metodo_pagamento import MetodoPagamento
from finance_journal.models.movimento import Movimento
from finance_journal.repositories.categoria import CategoriaRepository
from finance_journal.repositories.dettaglio import DettaglioRepository
from finance_journal.repositories.impostazioni import ImpostazioniRepository
from finance_journal.repositories.metodo_pagamento import MetodoPagamentoRepository
from finance_journal.repositories.movimento import MovimentoRepository
from finance_journal.ui import theme as th
from finance_journal.ui.movimento_dialog import MovimentoDialog
from finance_journal.ui.toast import Toast

logger = logging.getLogger(__name__)

_SEZIONE = "personale"

_MESI = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]
_COLS = ["Data", "Tipo", "Importo", "Categoria", "Dettaglio", "Metodo di pagamento", "Nota", ""]


class _EmptyState(QWidget):
    add_clicked = pyqtSignal()

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        p = th.current_palette()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 60, 40, 60)

        lbl = QLabel("Nessun movimento trovato")
        lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl.setStyleSheet(f"font-size: {th.FONT_XL}; color: {p.muted};")
        layout.addWidget(lbl)

        sub = QLabel("Aggiungi il tuo primo movimento per iniziare a tracciare le spese.")
        sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        sub.setWordWrap(True)
        sub.setStyleSheet(f"color: {p.muted}; margin-top: 6px;")
        layout.addWidget(sub)

        btn = QPushButton("Aggiungi Movimento")
        btn.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
        btn.clicked.connect(self.add_clicked)
        layout.addWidget(btn, alignment=Qt.AlignmentFlag.AlignCenter)


class MovimentiWidget(QWidget):
    dati_modificati = pyqtSignal()

    def __init__(self, conn: sqlite3.Connection, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._conn = conn
        self._repo_mov = MovimentoRepository(conn)
        self._repo_cat = CategoriaRepository(conn)
        self._repo_met = MetodoPagamentoRepository(conn)
        self._repo_det = DettaglioRepository(conn)
        self._repo_imp = ImpostazioniRepository(conn)
        self._categorie: list[Categoria] = []
        self._metodi: list[MetodoPagamento] = []
        self._dettagli: list[Dettaglio] = []
        self._categorie_map: dict[int, str] = {}
        self._metodi_map: dict[int, str] = {}
        self._dettagli_map: dict[int, str] = {}
        self._movimenti_list: list[Movimento] = []

        self._debounce_timer = QTimer(self)
        self._debounce_timer.setSingleShot(True)
        self._debounce_timer.setInterval(300)
        self._debounce_timer.timeout.connect(self._load_table)

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
        self._mese_combo.addItem("Tutti i mesi", None)
        for i, nome in enumerate(_MESI):
            self._mese_combo.addItem(nome, i + 1)
        self._mese_combo.setCurrentIndex(0)
        self._mese_combo.currentIndexChanged.connect(self._load_table)
        filter_row.addWidget(self._mese_combo)

        filter_row.addWidget(QLabel("Anno:"))
        self._anno_combo = QComboBox()
        self._anno_combo.addItem("Tutti gli anni", None)
        for anno in self._repo_mov.list_anni(sezione=_SEZIONE):
            self._anno_combo.addItem(str(anno), anno)
        self._anno_combo.currentIndexChanged.connect(self._load_table)
        filter_row.addWidget(self._anno_combo)

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
        self._dettagli = self._repo_det.list()
        self._dettagli_map = {d.id: d.nome for d in self._dettagli if d.id is not None}
        filter_row.addWidget(self._met_filter)

        self._search_edit = QLineEdit()
        self._search_edit.setPlaceholderText("Cerca nota…")
        self._search_edit.textChanged.connect(self._on_search_changed)
        filter_row.addWidget(self._search_edit, stretch=1)

        root.addLayout(filter_row)

        self._stack = QStackedWidget()
        self._table = QTableWidget()
        self._table.setColumnCount(len(_COLS))
        self._table.setHorizontalHeaderLabels(_COLS)
        self._table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self._table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self._table.setAlternatingRowColors(True)
        header = self._table.horizontalHeader()
        header.setStretchLastSection(False)
        header.setSectionResizeMode(len(_COLS) - 2, QHeaderView.ResizeMode.Stretch)
        self._table.setColumnWidth(len(_COLS) - 1, 170)
        self._table.verticalHeader().setVisible(False)

        self._empty_state = _EmptyState()
        self._empty_state.add_clicked.connect(self._on_add)

        self._stack.addWidget(self._table)
        self._stack.addWidget(self._empty_state)
        root.addWidget(self._stack)

        btn_row = QHBoxLayout()
        self._btn_elimina_tutti = QPushButton("Elimina movimenti mostrati")
        self._btn_elimina_tutti.setProperty("danger", True)
        self._btn_elimina_tutti.style().unpolish(self._btn_elimina_tutti)
        self._btn_elimina_tutti.style().polish(self._btn_elimina_tutti)
        self._btn_elimina_tutti.setEnabled(False)
        self._btn_elimina_tutti.clicked.connect(self._on_elimina_tutti)
        btn_row.addWidget(self._btn_elimina_tutti)
        btn_row.addStretch()
        self._btn_add = QPushButton("Aggiungi Movimento")
        self._btn_add.clicked.connect(self._on_add)
        btn_row.addWidget(self._btn_add)
        root.addLayout(btn_row)

    def _on_search_changed(self) -> None:
        self._debounce_timer.start()

    def refresh(self) -> None:
        self._reload_lookups()
        self._load_table()

    def open_new_movement(self) -> None:
        self._on_add()

    def focus_search(self) -> None:
        self._search_edit.setFocus()

    def _reload_lookups(self) -> None:
        self._categorie = self._repo_cat.list()
        self._metodi = self._repo_met.list()
        self._dettagli = self._repo_det.list()
        self._categorie_map = {c.id: c.nome for c in self._categorie}
        self._metodi_map = {m.id: m.nome for m in self._metodi}
        self._dettagli_map = {d.id: d.nome for d in self._dettagli if d.id is not None}

        prev_anno = self._anno_combo.currentData()
        self._anno_combo.blockSignals(True)
        self._anno_combo.clear()
        self._anno_combo.addItem("Tutti gli anni", None)
        for anno in self._repo_mov.list_anni(sezione=_SEZIONE):
            self._anno_combo.addItem(str(anno), anno)
        idx = self._anno_combo.findData(prev_anno)
        self._anno_combo.setCurrentIndex(max(0, idx))
        self._anno_combo.blockSignals(False)

        prev_cat = self._cat_filter.currentData()
        self._cat_filter.blockSignals(True)
        self._cat_filter.clear()
        self._cat_filter.addItem("Tutte", None)
        for c in self._categorie:
            self._cat_filter.addItem(c.nome, c.id)
        idx = self._cat_filter.findData(prev_cat)
        self._cat_filter.setCurrentIndex(max(0, idx))
        self._cat_filter.blockSignals(False)

        prev_met = self._met_filter.currentData()
        self._met_filter.blockSignals(True)
        self._met_filter.clear()
        self._met_filter.addItem("Tutti", None)
        for m in self._metodi:
            self._met_filter.addItem(m.nome, m.id)
        idx = self._met_filter.findData(prev_met)
        self._met_filter.setCurrentIndex(max(0, idx))
        self._met_filter.blockSignals(False)

    def _load_table(self) -> None:
        mese = self._mese_combo.currentData()
        anno = self._anno_combo.currentData()
        tipo = self._tipo_combo.currentData()
        cat_id = self._cat_filter.currentData()
        met_id = self._met_filter.currentData()
        testo = self._search_edit.text().strip() or None

        valuta = self._repo_imp.get("valuta", "€") or "€"
        self._movimenti_list = self._repo_mov.list(
            sezione=_SEZIONE,
            anno=anno,
            mese=mese,
            tipo=tipo,
            categoria_id=cat_id,
            metodo_id=met_id,
            testo=testo,
        )

        has_data = len(self._movimenti_list) > 0
        self._stack.setCurrentIndex(0 if has_data else 1)
        self._btn_elimina_tutti.setEnabled(has_data)

        self._table.setRowCount(len(self._movimenti_list))
        for row, m in enumerate(self._movimenti_list):
            self._table.setItem(row, 0, QTableWidgetItem(m.data.isoformat()))
            tipo_label = "Entrata" if m.tipo == TipoMovimento.ENTRATA else "Uscita"
            self._table.setItem(row, 1, QTableWidgetItem(tipo_label))
            self._table.setItem(row, 2, QTableWidgetItem(f"{valuta} {m.importo:,.2f}"))
            cat_nome = self._categorie_map.get(m.categoria_id, "—")
            self._table.setItem(row, 3, QTableWidgetItem(cat_nome))
            det_nome = self._dettagli_map.get(m.dettaglio_id, "—") if m.dettaglio_id else "—"
            self._table.setItem(row, 4, QTableWidgetItem(det_nome))
            met_nome = self._metodi_map.get(m.metodo_id, "—")
            self._table.setItem(row, 5, QTableWidgetItem(met_nome))
            self._table.setItem(row, 6, QTableWidgetItem(m.nota or ""))

            cell = QWidget()
            lay = QHBoxLayout(cell)
            lay.setContentsMargins(2, 2, 2, 2)
            lay.setSpacing(4)
            btn_mod = QPushButton("Modifica")
            btn_mod.clicked.connect(lambda checked=False, r=row: self._on_modifica(r))
            btn_del = QPushButton("Elimina")
            btn_del.setProperty("danger", True)
            btn_del.style().unpolish(btn_del)
            btn_del.style().polish(btn_del)
            btn_del.clicked.connect(lambda checked=False, r=row: self._on_elimina_riga(r))
            lay.addWidget(btn_mod)
            lay.addWidget(btn_del)
            self._table.setCellWidget(row, len(_COLS) - 1, cell)

    def _refresh(self) -> None:
        self._reload_lookups()
        self._load_table()
        self.dati_modificati.emit()

    def _show_toast(
        self,
        message: str,
        undo_callback: "Callable[[], None] | None" = None,
    ) -> None:
        parent = self.parent() or self
        Toast(message, parent=parent, undo_callback=undo_callback)

    def _restore_movimento(self, m: Movimento) -> None:
        tipo = m.tipo.value if hasattr(m.tipo, "value") else m.tipo
        try:
            self._repo_mov.create_movimento(
                data=m.data,
                tipo=tipo,
                importo=m.importo,
                categoria_id=m.categoria_id,
                metodo_id=m.metodo_id,
                sezione=_SEZIONE,
                nota=m.nota,
                dettaglio_id=m.dettaglio_id,
            )
        except Exception:
            logger.exception("Errore nel ripristino del movimento")

    def _on_add(self) -> None:
        dialog = MovimentoDialog(
            self._categorie, self._metodi,
            dettagli=self._dettagli,
            cat_repo=self._repo_cat, met_repo=self._repo_met,
            parent=self,
        )
        if dialog.exec() == MovimentoDialog.DialogCode.Accepted:
            d = dialog.get_data()
            try:
                self._repo_mov.create_movimento(
                    data=d["data"],
                    tipo=d["tipo"],
                    importo=d["importo"],
                    categoria_id=d["categoria_id"],
                    metodo_id=d["metodo_id"],
                    sezione=_SEZIONE,
                    nota=d["nota"],
                    dettaglio_id=d["dettaglio_id"],
                )
            except Exception:
                logger.exception("Errore durante la creazione del movimento")
                raise
            self._refresh()
            self._show_toast("Movimento aggiunto.")

    def _on_modifica(self, row: int) -> None:
        if row < 0 or row >= len(self._movimenti_list):
            return
        movimento = self._movimenti_list[row]
        dialog = MovimentoDialog(
            self._categorie, self._metodi,
            dettagli=self._dettagli,
            cat_repo=self._repo_cat, met_repo=self._repo_met,
            movimento=movimento, parent=self,
        )
        if dialog.exec() != MovimentoDialog.DialogCode.Accepted:
            return
        d = dialog.get_data()
        try:
            self._repo_mov.update_movimento(
                movimento.id,
                data=d["data"],
                tipo=d["tipo"],
                importo=d["importo"],
                categoria_id=d["categoria_id"],
                metodo_id=d["metodo_id"],
                nota=d["nota"],
                dettaglio_id=d["dettaglio_id"],
            )
        except Exception:
            logger.exception("Errore durante l'aggiornamento del movimento #%d", movimento.id)
            raise
        self._refresh()
        self._show_toast("Movimento modificato.")

    def _on_elimina_tutti(self) -> None:
        n = len(self._movimenti_list)
        risposta = QMessageBox.question(
            self,
            "Conferma eliminazione",
            f"Sei sicuro di voler eliminare {n} Moviment{'o' if n == 1 else 'i'}?"
            " L'operazione è irreversibile.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if risposta != QMessageBox.StandardButton.Yes:
            return

        eliminati = list(self._movimenti_list)
        try:
            self._repo_mov.delete_all(
                sezione=_SEZIONE,
                anno=self._anno_combo.currentData(),
                mese=self._mese_combo.currentData(),
                tipo=self._tipo_combo.currentData(),
                categoria_id=self._cat_filter.currentData(),
                metodo_id=self._met_filter.currentData(),
                testo=self._search_edit.text().strip() or None,
            )
        except Exception:
            logger.exception("Errore durante l'eliminazione massiva dei movimenti")
            raise
        self._refresh()

        def _undo_tutti() -> None:
            for m in eliminati:
                self._restore_movimento(m)
            self._refresh()

        self._show_toast(
            f"{n} moviment{'o eliminato' if n == 1 else 'i eliminati'}.",
            undo_callback=_undo_tutti,
        )

    def _on_elimina_riga(self, row: int) -> None:
        if row < 0 or row >= len(self._movimenti_list):
            return
        movimento = self._movimenti_list[row]
        risposta = QMessageBox.question(
            self,
            "Conferma eliminazione",
            "Sei sicuro di voler eliminare questo Movimento?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if risposta != QMessageBox.StandardButton.Yes:
            return
        try:
            self._repo_mov.delete_movimento(movimento.id)
        except Exception:
            logger.exception("Errore durante l'eliminazione del movimento #%d", movimento.id)
            raise
        self._refresh()

        def _undo() -> None:
            self._restore_movimento(movimento)
            self._refresh()

        self._show_toast("Movimento eliminato.", undo_callback=_undo)
