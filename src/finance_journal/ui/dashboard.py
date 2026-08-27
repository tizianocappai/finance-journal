from __future__ import annotations

import sqlite3
from datetime import date

from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg
from matplotlib.figure import Figure
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from finance_journal.aggregation.dashboard import (
    breakdown_categorie,
    breakdown_mensile,
    kpi_annuali,
    trend_annuale,
)
from finance_journal.repositories.categoria import CategoriaRepository
from finance_journal.repositories.impostazioni import ImpostazioniRepository
from finance_journal.repositories.movimento import MovimentoRepository

_MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
         "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]


class _KpiTile(QFrame):
    def __init__(self, label: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFrameShape(QFrame.Shape.StyledPanel)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self.setStyleSheet(
            "QFrame { background: #f5f5f5; border-radius: 8px; }"
        )
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)

        lbl = QLabel(label)
        lbl.setStyleSheet("color: #777; font-size: 11px;")
        self._value = QLabel("—")
        self._value.setStyleSheet("font-size: 20px; font-weight: bold;")
        layout.addWidget(lbl)
        layout.addWidget(self._value)

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
        self._build_ui()
        self.refresh()

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(16, 16, 16, 16)
        root.setSpacing(12)

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

        # KPI tiles
        kpi_row = QHBoxLayout()
        kpi_row.setSpacing(10)
        self._kpi_entrate = _KpiTile("Totale Entrate")
        self._kpi_uscite = _KpiTile("Totale Uscite")
        self._kpi_saldo = _KpiTile("Saldo Netto")
        self._kpi_rossi = _KpiTile("Mesi in Rosso")
        for tile in (self._kpi_entrate, self._kpi_uscite, self._kpi_saldo, self._kpi_rossi):
            kpi_row.addWidget(tile)
        root.addLayout(kpi_row)

        # Barre + Donut
        charts_row = QHBoxLayout()
        charts_row.setSpacing(8)

        self._fig_barre = Figure(figsize=(5, 3), tight_layout=True)
        self._canvas_barre = FigureCanvasQTAgg(self._fig_barre)
        self._canvas_barre.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self._canvas_barre.setMinimumHeight(220)
        charts_row.addWidget(self._canvas_barre, stretch=3)

        self._fig_donut = Figure(figsize=(4, 3), tight_layout=True)
        self._canvas_donut = FigureCanvasQTAgg(self._fig_donut)
        self._canvas_donut.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self._canvas_donut.setMinimumHeight(220)
        charts_row.addWidget(self._canvas_donut, stretch=2)

        root.addLayout(charts_row)

        # Trend
        self._fig_trend = Figure(figsize=(10, 2.5), tight_layout=True)
        self._canvas_trend = FigureCanvasQTAgg(self._fig_trend)
        self._canvas_trend.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self._canvas_trend.setMinimumHeight(180)
        root.addWidget(self._canvas_trend)

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

    def _draw_barre(self, movimenti) -> None:
        data = breakdown_mensile(movimenti, self._anno)
        entrate = [d["entrate"] for d in data]
        uscite = [d["uscite"] for d in data]

        self._fig_barre.clear()
        ax = self._fig_barre.add_subplot(111)
        x = list(range(12))
        w = 0.35
        ax.bar([i - w / 2 for i in x], entrate, width=w, label="Entrate", color="#4CAF50")
        ax.bar([i + w / 2 for i in x], uscite, width=w, label="Uscite", color="#F44336")
        ax.set_xticks(x)
        ax.set_xticklabels(_MESI, fontsize=8)
        ax.tick_params(axis="y", labelsize=8)
        ax.legend(fontsize=8)
        ax.set_title("Entrate / Uscite mensili", fontsize=10)
        self._canvas_barre.draw()

    def _draw_donut(self, movimenti, categorie: dict[int, str]) -> None:
        data = breakdown_categorie(movimenti, self._anno, categorie)
        self._fig_donut.clear()
        ax = self._fig_donut.add_subplot(111)
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
            ax.legend(wedges, labels, loc="center left",
                      bbox_to_anchor=(1, 0.5), fontsize=7)
        else:
            ax.text(0, 0, "Nessun dato", ha="center", va="center", fontsize=10)
            ax.set_xlim(-1, 1)
            ax.set_ylim(-1, 1)
        ax.set_title("Uscite per Categoria", fontsize=10)
        self._canvas_donut.draw()

    def _draw_trend(self, movimenti) -> None:
        trend = trend_annuale(movimenti, self._anno)
        corrente = [d["entrate"] - d["uscite"] for d in trend["corrente"]]
        precedente = [d["entrate"] - d["uscite"] for d in trend["precedente"]]

        self._fig_trend.clear()
        ax = self._fig_trend.add_subplot(111)
        ax.plot(_MESI, corrente, marker="o", markersize=4,
                label=str(self._anno), color="#2196F3", linewidth=1.5)
        if any(v != 0 for v in precedente):
            ax.plot(_MESI, precedente, marker="o", markersize=4,
                    label=str(self._anno - 1), color="#9E9E9E",
                    linewidth=1.5, linestyle="--")
        ax.axhline(0, color="#cccccc", linewidth=0.8)
        ax.tick_params(axis="both", labelsize=8)
        ax.legend(fontsize=8)
        ax.set_title("Trend mensile (saldo)", fontsize=10)
        self._canvas_trend.draw()

    def _prev_year(self) -> None:
        self._anno -= 1
        self._anno_label.setText(str(self._anno))
        self.refresh()

    def _next_year(self) -> None:
        self._anno += 1
        self._anno_label.setText(str(self._anno))
        self.refresh()

