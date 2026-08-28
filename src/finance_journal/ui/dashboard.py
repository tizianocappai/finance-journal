from __future__ import annotations

import sqlite3
from datetime import date

from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg
from matplotlib.figure import Figure
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QColor
from PyQt6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from finance_journal.aggregation.dashboard import (
    breakdown_categorie,
    breakdown_mensile,
    kpi_annuali,
    pivot_categorie,
    riepilogo_mensile,
    trend_annuale,
)
from finance_journal.repositories.categoria import CategoriaRepository
from finance_journal.repositories.impostazioni import ImpostazioniRepository
from finance_journal.repositories.movimento import MovimentoRepository
from finance_journal.ui import theme as th

_MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
         "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]

_MESI_FULL = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]

_TIPO_LABEL = {"totale": "Totale", "media": "Media", "mediana": "Mediana"}


def _color_item(item: QTableWidgetItem, value: float) -> None:
    p = th.current_palette()
    if value > 0:
        item.setForeground(QColor(p.success))
    elif value < 0:
        item.setForeground(QColor(p.danger))


_PIVOT_HEADERS = ["Categoria"] + _MESI + ["Totale", "Media", "Mediana"]
_IDX_TOTALE = _PIVOT_HEADERS.index("Totale")
_IDX_MEDIA = _PIVOT_HEADERS.index("Media")
_IDX_MEDIANA = _PIVOT_HEADERS.index("Mediana")


def _fmt_val(val: float | None) -> str:
    return "—" if val is None else f"{val:,.2f}"


def _make_amount_item(valuta: str, value: float) -> QTableWidgetItem:
    return QTableWidgetItem(f"{valuta} {value:,.2f}")


def _make_pivot_table() -> QTableWidget:
    table = QTableWidget()
    table.setColumnCount(len(_PIVOT_HEADERS))
    table.setHorizontalHeaderLabels(_PIVOT_HEADERS)
    table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
    table.verticalHeader().setVisible(False)
    table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
    table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
    table.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
    table.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
    return table


def _set_table_fixed_height(table: QTableWidget) -> None:
    if table.rowCount() > 0:
        table.setFixedHeight(
            table.horizontalHeader().height()
            + table.rowHeight(0) * table.rowCount()
            + 4
        )


class _KpiTile(QFrame):
    def __init__(self, label: str, bg_attr: str, value_color_attr: str | None = None,
                 parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._bg_attr = bg_attr
        self._value_color_attr = value_color_attr
        self.setFrameShape(QFrame.Shape.StyledPanel)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 12, 14, 12)
        layout.setSpacing(4)

        self._lbl = QLabel(label)
        self._value = QLabel("—")
        layout.addWidget(self._lbl)
        layout.addWidget(self._value)
        self._apply_theme()

    def _apply_theme(self) -> None:
        p = th.current_palette()
        bg = getattr(p, self._bg_attr)
        self.setStyleSheet(
            f"QFrame {{ background-color: {bg}; border-radius: {th.RADIUS_MD}px;"
            f" border: 1px solid {p.border}; }}"
        )
        self._lbl.setStyleSheet(f"color: {p.muted}; font-size: {th.FONT_SM};")
        value_color = getattr(p, self._value_color_attr) if self._value_color_attr else p.text
        self._value.setStyleSheet(
            f"font-size: {th.FONT_XL}; font-weight: bold; color: {value_color};"
        )

    def set_value(self, text: str) -> None:
        self._value.setText(text)


class DashboardWidget(QWidget):
    def __init__(self, conn: sqlite3.Connection, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._conn = conn
        self._repo_mov = MovimentoRepository(conn)
        self._repo_cat = CategoriaRepository(conn)
        self._repo_imp = ImpostazioniRepository(conn)
        self._anno = date.today().year

        # tooltip state
        self._cid_barre: int | None = None
        self._cid_donut: int | None = None
        self._cid_trend: int | None = None
        self._ann_barre = None
        self._ann_donut = None
        self._ann_trend = None
        self._barre_data: list[dict] = []
        self._barre_rects_e: list = []
        self._barre_rects_u: list = []
        self._donut_data: list[dict] = []
        self._donut_wedges: list = []
        self._trend_corrente: list[float] = []
        self._trend_precedente: list[float] = []
        self._trend_line_corr = None
        self._trend_line_prec = None

        self._build_ui()
        self.refresh()

    def _build_ui(self) -> None:
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        outer.addWidget(scroll)

        container = QWidget()
        scroll.setWidget(container)

        root = QVBoxLayout(container)
        root.setContentsMargins(20, 20, 20, 24)
        root.setSpacing(0)

        # Intestazione sezione
        titolo = QLabel("Resoconto Personale")
        titolo.setStyleSheet("font-size: 18px; font-weight: bold;")
        root.addWidget(titolo)
        root.addSpacing(12)

        # Anno navigator
        nav = QHBoxLayout()
        self._btn_prev = QPushButton("←")
        self._btn_prev.setFixedWidth(32)
        self._btn_prev.clicked.connect(self._prev_year)
        self._anno_label = QLabel(str(self._anno))
        self._anno_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._anno_label.setMinimumWidth(60)
        self._anno_label.setStyleSheet("font-size: 16px; font-weight: bold;")
        self._btn_next = QPushButton("→")
        self._btn_next.setFixedWidth(32)
        self._btn_next.clicked.connect(self._next_year)
        nav.addStretch()
        nav.addWidget(self._btn_prev)
        nav.addWidget(self._anno_label)
        nav.addWidget(self._btn_next)
        nav.addStretch()
        root.addLayout(nav)
        root.addSpacing(16)

        # KPI tiles
        kpi_row = QHBoxLayout()
        kpi_row.setSpacing(12)
        self._kpi_entrate = _KpiTile("Totale Entrate", "kpi_entrate_bg", "success")
        self._kpi_uscite = _KpiTile("Totale Uscite", "kpi_uscite_bg", "danger")
        self._kpi_saldo = _KpiTile("Saldo Netto", "kpi_saldo_bg", "primary")
        self._kpi_rossi = _KpiTile("Mesi in Rosso", "surface")
        for tile in (self._kpi_entrate, self._kpi_uscite, self._kpi_saldo, self._kpi_rossi):
            kpi_row.addWidget(tile)
        root.addLayout(kpi_row)
        root.addSpacing(20)

        # Barre + Donut
        charts_row = QHBoxLayout()
        charts_row.setSpacing(12)

        self._fig_barre = Figure(figsize=(5, 3.2), tight_layout=True)
        self._canvas_barre = FigureCanvasQTAgg(self._fig_barre)
        self._canvas_barre.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self._canvas_barre.setMinimumHeight(280)
        charts_row.addWidget(self._canvas_barre, stretch=3)

        self._fig_donut = Figure(figsize=(4, 3.2), tight_layout=True)
        self._canvas_donut = FigureCanvasQTAgg(self._fig_donut)
        self._canvas_donut.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self._canvas_donut.setMinimumHeight(280)
        charts_row.addWidget(self._canvas_donut, stretch=2)

        root.addLayout(charts_row)
        root.addSpacing(12)

        # Trend
        self._fig_trend = Figure(figsize=(10, 2.8), tight_layout=True)
        self._canvas_trend = FigureCanvasQTAgg(self._fig_trend)
        self._canvas_trend.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self._canvas_trend.setMinimumHeight(220)
        root.addWidget(self._canvas_trend)
        root.addSpacing(24)

        # Tabella riepilogo mensile
        lbl_tabella = QLabel("Riepilogo mensile")
        lbl_tabella.setStyleSheet("font-size: 14px; font-weight: bold;")
        root.addWidget(lbl_tabella)
        root.addSpacing(6)

        self._table = QTableWidget()
        self._table.setColumnCount(5)
        self._table.setHorizontalHeaderLabels(
            ["Mese", "Entrate", "Uscite", "Saldo", "Δ vs mese prec."]
        )
        self._table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self._table.verticalHeader().setVisible(False)
        self._table.horizontalHeader().setSectionResizeMode(
            QHeaderView.ResizeMode.Stretch
        )
        self._table.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        root.addWidget(self._table)
        root.addSpacing(24)

        # Pivot uscite
        lbl_uscite = QLabel("Uscite per categoria")
        lbl_uscite.setStyleSheet("font-size: 14px; font-weight: bold;")
        root.addWidget(lbl_uscite)
        root.addSpacing(6)
        self._table_uscite = _make_pivot_table()
        root.addWidget(self._table_uscite)
        root.addSpacing(24)

        # Pivot entrate
        lbl_entrate = QLabel("Entrate per categoria")
        lbl_entrate.setStyleSheet("font-size: 14px; font-weight: bold;")
        root.addWidget(lbl_entrate)
        root.addSpacing(6)
        self._table_entrate = _make_pivot_table()
        root.addWidget(self._table_entrate)

        root.addStretch()

    def refresh(self) -> None:
        movimenti = self._repo_mov.list(sezione="personale")
        categorie = {c.id: c.nome for c in self._repo_cat.list()}
        valuta = self._repo_imp.get("valuta", "€") or "€"

        saldo_iniziale, saldo_iniziale_data = self._repo_imp.get_saldo_iniziale()

        kpi = kpi_annuali(movimenti, self._anno, saldo_iniziale, saldo_iniziale_data)
        self._kpi_entrate.set_value(f"{valuta} {kpi['entrate']:,.2f}")
        self._kpi_uscite.set_value(f"{valuta} {kpi['uscite']:,.2f}")
        self._kpi_saldo.set_value(f"{valuta} {kpi['saldo']:,.2f}")
        self._kpi_rossi.set_value(str(kpi["mesi_in_rosso"]))

        self._draw_barre(movimenti)
        self._draw_donut(movimenti, categorie)
        self._draw_trend(movimenti)
        self._draw_tabella(movimenti, valuta)
        self._draw_pivot(movimenti, categorie)

    def _draw_barre(self, movimenti) -> None:
        data = breakdown_mensile(movimenti, self._anno)
        entrate = [d["entrate"] for d in data]
        uscite = [d["uscite"] for d in data]
        p = th.current_palette()

        self._fig_barre.clear()
        ax = self._fig_barre.add_subplot(111)
        ax.set_facecolor(p.surface)
        self._fig_barre.patch.set_facecolor(p.surface)
        x = list(range(12))
        w = 0.35
        bc_e = ax.bar(
            [i - w / 2 for i in x], entrate, width=w,
            label="Entrate", color=p.chart_entrate,
            hatch="", edgecolor=p.surface,
        )
        bc_u = ax.bar(
            [i + w / 2 for i in x], uscite, width=w,
            label="Uscite", color=p.chart_uscite,
            hatch="//", edgecolor=p.surface,
        )
        for rect, val in zip(bc_e.patches, entrate):
            if val > 0:
                ax.text(
                    rect.get_x() + rect.get_width() / 2, rect.get_height(),
                    f"{val:,.0f}", ha="center", va="bottom", fontsize=6, color=p.text,
                )
        for rect, val in zip(bc_u.patches, uscite):
            if val > 0:
                ax.text(
                    rect.get_x() + rect.get_width() / 2, rect.get_height(),
                    f"{val:,.0f}", ha="center", va="bottom", fontsize=6, color=p.text,
                )
        ax.set_xticks(x)
        ax.set_xticklabels(_MESI, fontsize=8, color=p.text)
        ax.tick_params(axis="y", labelsize=8, colors=p.text)
        ax.tick_params(axis="x", colors=p.text)
        for spine in ax.spines.values():
            spine.set_color(p.border)
        ax.legend(fontsize=8, facecolor=p.surface, edgecolor=p.border, labelcolor=p.text)
        ax.set_title("Entrate / Uscite mensili", fontsize=10, color=p.text)

        self._barre_data = data
        self._barre_rects_e = bc_e.patches
        self._barre_rects_u = bc_u.patches
        self._ann_barre = ax.annotate(
            "", xy=(0, 0), xytext=(10, 10), textcoords="offset points",
            bbox=dict(boxstyle="round,pad=0.4", fc=p.surface, ec=p.border, alpha=0.9),
            fontsize=8, visible=False, color=p.text,
        )

        if self._cid_barre is not None:
            self._canvas_barre.mpl_disconnect(self._cid_barre)
        self._cid_barre = self._canvas_barre.mpl_connect(
            "motion_notify_event", self._on_hover_barre
        )
        self._canvas_barre.draw()

    def _draw_donut(self, movimenti, categorie: dict[int, str]) -> None:
        data = breakdown_categorie(movimenti, self._anno, categorie)
        p = th.current_palette()
        self._fig_donut.clear()
        ax = self._fig_donut.add_subplot(111)
        ax.set_facecolor(p.surface)
        self._fig_donut.patch.set_facecolor(p.surface)
        if data:
            labels = [d["nome"] for d in data]
            sizes = [d["totale"] for d in data]
            wedges, _, autotexts = ax.pie(
                sizes,
                labels=None,
                autopct="%1.1f%%",
                pctdistance=0.75,
                startangle=90,
                wedgeprops={"width": 0.5},
            )
            for t in autotexts:
                t.set_fontsize(7)
                t.set_color(p.text)
            ax.legend(
                wedges, labels, loc="center left",
                bbox_to_anchor=(1, 0.5), fontsize=7,
                facecolor=p.surface, edgecolor=p.border, labelcolor=p.text,
            )
            self._donut_wedges = list(wedges)
            self._donut_data = data
        else:
            ax.text(0, 0, "Nessun dato", ha="center", va="center", fontsize=10, color=p.muted)
            ax.set_xlim(-1, 1)
            ax.set_ylim(-1, 1)
            self._donut_wedges = []
            self._donut_data = []
        ax.set_title("Uscite per Categoria", fontsize=10, color=p.text)

        self._ann_donut = ax.annotate(
            "", xy=(0, 0), xytext=(10, 10), textcoords="offset points",
            bbox=dict(boxstyle="round,pad=0.4", fc=p.surface, ec=p.border, alpha=0.9),
            fontsize=8, visible=False, color=p.text,
        )

        if self._cid_donut is not None:
            self._canvas_donut.mpl_disconnect(self._cid_donut)
        self._cid_donut = self._canvas_donut.mpl_connect(
            "motion_notify_event", self._on_hover_donut
        )
        self._canvas_donut.draw()

    def _draw_trend(self, movimenti) -> None:
        trend = trend_annuale(movimenti, self._anno)
        corrente = [d["entrate"] - d["uscite"] for d in trend["corrente"]]
        precedente = [d["entrate"] - d["uscite"] for d in trend["precedente"]]
        p = th.current_palette()

        self._fig_trend.clear()
        ax = self._fig_trend.add_subplot(111)
        ax.set_facecolor(p.surface)
        self._fig_trend.patch.set_facecolor(p.surface)
        line_corr, = ax.plot(
            _MESI, corrente, marker="o", markersize=4,
            label=str(self._anno), color=p.chart_saldo, linewidth=1.5,
        )
        line_prec = None
        has_prec = any(v != 0 for v in precedente)
        if has_prec:
            line_prec, = ax.plot(
                _MESI, precedente, marker="s", markersize=4,
                label=str(self._anno - 1), color=p.chart_precedente,
                linewidth=1.5, linestyle="--",
            )
        ax.axhline(0, color=p.border, linewidth=0.8)
        ax.tick_params(axis="both", labelsize=8, colors=p.text)
        for spine in ax.spines.values():
            spine.set_color(p.border)
        ax.legend(fontsize=8, facecolor=p.surface, edgecolor=p.border, labelcolor=p.text)
        ax.set_title("Trend mensile (saldo)", fontsize=10, color=p.text)

        self._trend_corrente = corrente
        self._trend_precedente = precedente
        self._trend_line_corr = line_corr
        self._trend_line_prec = line_prec
        self._ann_trend = ax.annotate(
            "", xy=(0, 0), xytext=(10, 10), textcoords="offset points",
            bbox=dict(boxstyle="round,pad=0.4", fc=p.surface, ec=p.border, alpha=0.9),
            fontsize=8, visible=False, color=p.text,
        )

        if self._cid_trend is not None:
            self._canvas_trend.mpl_disconnect(self._cid_trend)
        self._cid_trend = self._canvas_trend.mpl_connect(
            "motion_notify_event", self._on_hover_trend
        )
        self._canvas_trend.draw()

    def _on_hover_barre(self, event) -> None:
        if self._ann_barre is None or event.inaxes is None:
            if self._ann_barre is not None:
                self._ann_barre.set_visible(False)
                self._canvas_barre.draw_idle()
            return

        for i, (rect_e, rect_u) in enumerate(zip(self._barre_rects_e, self._barre_rects_u)):
            if rect_e.contains(event)[0] or rect_u.contains(event)[0]:
                d = self._barre_data[i]
                saldo = d["entrate"] - d["uscite"]
                text = (
                    f"{_MESI[d['mese'] - 1]}\n"
                    f"Entrate: {d['entrate']:,.2f}\n"
                    f"Uscite: {d['uscite']:,.2f}\n"
                    f"Saldo: {saldo:,.2f}"
                )
                self._ann_barre.set_text(text)
                self._ann_barre.xy = (event.xdata, event.ydata)
                self._ann_barre.set_visible(True)
                self._canvas_barre.draw_idle()
                return

        self._ann_barre.set_visible(False)
        self._canvas_barre.draw_idle()

    def _on_hover_donut(self, event) -> None:
        if self._ann_donut is None or event.inaxes is None:
            if self._ann_donut is not None:
                self._ann_donut.set_visible(False)
                self._canvas_donut.draw_idle()
            return

        total = sum(d["totale"] for d in self._donut_data)
        for i, wedge in enumerate(self._donut_wedges):
            if wedge.contains(event)[0]:
                d = self._donut_data[i]
                pct = d["totale"] / total * 100 if total else 0.0
                text = f"{d['nome']}\n{d['totale']:,.2f}\n{pct:.1f}%"
                self._ann_donut.set_text(text)
                self._ann_donut.xy = (event.xdata, event.ydata)
                self._ann_donut.set_visible(True)
                self._canvas_donut.draw_idle()
                return

        self._ann_donut.set_visible(False)
        self._canvas_donut.draw_idle()

    def _on_hover_trend(self, event) -> None:
        if self._ann_trend is None or event.inaxes is None or self._trend_line_corr is None:
            if self._ann_trend is not None:
                self._ann_trend.set_visible(False)
                self._canvas_trend.draw_idle()
            return

        hit_corr, info_corr = self._trend_line_corr.contains(event)
        hit_prec, info_prec = (
            self._trend_line_prec.contains(event)
            if self._trend_line_prec is not None
            else (False, {})
        )

        if hit_corr:
            idx = info_corr["ind"][0]
            text = f"{_MESI[idx]}\n{self._anno}: {self._trend_corrente[idx]:,.2f}"
            if self._trend_line_prec is not None:
                text += f"\n{self._anno - 1}: {self._trend_precedente[idx]:,.2f}"
            self._ann_trend.xy = (idx, self._trend_corrente[idx])
        elif hit_prec:
            idx = info_prec["ind"][0]
            text = (
                f"{_MESI[idx]}\n"
                f"{self._anno}: {self._trend_corrente[idx]:,.2f}\n"
                f"{self._anno - 1}: {self._trend_precedente[idx]:,.2f}"
            )
            self._ann_trend.xy = (idx, self._trend_precedente[idx])
        else:
            self._ann_trend.set_visible(False)
            self._canvas_trend.draw_idle()
            return

        self._ann_trend.set_text(text)
        self._ann_trend.set_visible(True)
        self._canvas_trend.draw_idle()

    def _draw_tabella(self, movimenti, valuta: str) -> None:
        riepilogo = riepilogo_mensile(movimenti, self._anno)
        mesi_rows = [r for r in riepilogo if "mese" in r]
        footer_rows = [r for r in riepilogo if "tipo" in r]

        self._table.setRowCount(len(mesi_rows) + len(footer_rows))

        for i, row in enumerate(mesi_rows):
            self._table.setItem(i, 0, QTableWidgetItem(_MESI_FULL[row["mese"] - 1]))
            self._table.setItem(i, 1, _make_amount_item(valuta, row["entrate"]))
            self._table.setItem(i, 2, _make_amount_item(valuta, row["uscite"]))

            item_saldo = _make_amount_item(valuta, row["saldo"])
            _color_item(item_saldo, row["saldo"])
            self._table.setItem(i, 3, item_saldo)

            if row["mese"] == 1:
                self._table.setItem(i, 4, QTableWidgetItem("—"))
            else:
                item_delta = QTableWidgetItem(f"{row['delta']:+,.2f}")
                _color_item(item_delta, row["delta"])
                self._table.setItem(i, 4, item_delta)

        for i, row in enumerate(footer_rows, start=len(mesi_rows)):
            lbl = QTableWidgetItem(_TIPO_LABEL[row["tipo"]])
            font = lbl.font()
            font.setBold(True)
            lbl.setFont(font)
            self._table.setItem(i, 0, lbl)

            self._table.setItem(i, 1, _make_amount_item(valuta, row["entrate"]))
            self._table.setItem(i, 2, _make_amount_item(valuta, row["uscite"]))

            item_saldo = _make_amount_item(valuta, row["saldo"])
            _color_item(item_saldo, row["saldo"])
            self._table.setItem(i, 3, item_saldo)

            self._table.setItem(i, 4, QTableWidgetItem("—"))

        if self._table.rowCount() > 0:
            self._table.setFixedHeight(
                self._table.horizontalHeader().height()
                + self._table.rowHeight(0) * self._table.rowCount()
                + 4
            )

    def _draw_pivot(self, movimenti, categorie: dict[int, str]) -> None:
        self._draw_pivot_tipo(movimenti, categorie, "uscita", self._table_uscite)
        self._draw_pivot_tipo(movimenti, categorie, "entrata", self._table_entrate)

    def _draw_pivot_tipo(
        self,
        movimenti,
        categorie: dict[int, str],
        tipo: str,
        table: QTableWidget,
    ) -> None:
        dati = pivot_categorie(movimenti, self._anno, tipo, categorie)
        cat_list = dati["categorie"]
        totali_mensili = dati["totali_mensili"]
        media_mensile = dati["media_mensile"]
        mediana_mensile = dati["mediana_mensile"]

        footer = [
            ("Totale", totali_mensili),
            ("Media", media_mensile),
            ("Mediana", mediana_mensile),
        ]
        table.setRowCount(len(cat_list) + len(footer))

        for i, cat in enumerate(cat_list):
            table.setItem(i, 0, QTableWidgetItem(cat["nome"]))
            for j, val in enumerate(cat["mesi"]):
                table.setItem(i, j + 1, QTableWidgetItem(_fmt_val(val)))
            table.setItem(i, _IDX_TOTALE, QTableWidgetItem(f"{cat['totale_annuale']:,.2f}"))
            table.setItem(i, _IDX_MEDIA, QTableWidgetItem(f"{cat['media']:,.2f}"))
            table.setItem(i, _IDX_MEDIANA, QTableWidgetItem(f"{cat['mediana']:,.2f}"))

        for k, (label, valori_mensili) in enumerate(footer):
            i = len(cat_list) + k
            lbl = QTableWidgetItem(label)
            font = lbl.font()
            font.setBold(True)
            lbl.setFont(font)
            table.setItem(i, 0, lbl)
            for j, val in enumerate(valori_mensili):
                table.setItem(i, j + 1, QTableWidgetItem(_fmt_val(val)))
            table.setItem(i, _IDX_TOTALE, QTableWidgetItem("—"))
            table.setItem(i, _IDX_MEDIA, QTableWidgetItem("—"))
            table.setItem(i, _IDX_MEDIANA, QTableWidgetItem("—"))

        _set_table_fixed_height(table)

    def _prev_year(self) -> None:
        self._anno -= 1
        self._anno_label.setText(str(self._anno))
        self.refresh()

    def _next_year(self) -> None:
        self._anno += 1
        self._anno_label.setText(str(self._anno))
        self.refresh()

