"""Icone vettoriali disegnate con QPainter — nessuna dipendenza esterna."""
from __future__ import annotations

import math

from PyQt6.QtCore import Qt, QRectF
from PyQt6.QtGui import QColor, QIcon, QPainter, QPixmap


def _px(size: int, color: str) -> tuple[QPixmap, QPainter]:
    px = QPixmap(size, size)
    px.fill(Qt.GlobalColor.transparent)
    painter = QPainter(px)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setPen(Qt.PenStyle.NoPen)
    painter.setBrush(QColor(color))
    return px, painter


def icon_grid(color: str, size: int = 18) -> QIcon:
    """Griglia 2×2 — icona Dashboard."""
    px, p = _px(size, color)
    gap = size * 0.14
    sq = (size - 3 * gap) / 2
    for row in range(2):
        for col in range(2):
            x = gap + col * (sq + gap)
            y = gap + row * (sq + gap)
            p.drawRoundedRect(QRectF(x, y, sq, sq), 1.5, 1.5)
    p.end()
    return QIcon(px)


def icon_list(color: str, size: int = 18) -> QIcon:
    """Tre righe orizzontali — icona Movimenti."""
    px, p = _px(size, color)
    lh = max(2.0, size * 0.13)
    gap = (size - 3 * lh) / 4
    r = lh / 2
    for i in range(3):
        y = gap + i * (lh + gap)
        p.drawRoundedRect(QRectF(0, y, size, lh), r, r)
    p.end()
    return QIcon(px)


def icon_gear(color: str, size: int = 18) -> QIcon:
    """Ingranaggio semplificato — icona Impostazioni."""
    px, p = _px(size, color)
    c = size / 2
    r_tooth = size * 0.46
    r_body = size * 0.30
    r_hole = size * 0.16
    r_dot = size * 0.09
    n_teeth = 8

    # Cerchio corpo
    p.drawEllipse(QRectF(c - r_body, c - r_body, 2 * r_body, 2 * r_body))

    # Denti (cerchietti attorno al centro)
    for i in range(n_teeth):
        angle = math.radians(i * 360 / n_teeth)
        tx = c + r_tooth * math.cos(angle)
        ty = c + r_tooth * math.sin(angle)
        p.drawEllipse(QRectF(tx - r_dot, ty - r_dot, 2 * r_dot, 2 * r_dot))

    # Foro centrale (cancella con trasparenza)
    p.setCompositionMode(QPainter.CompositionMode.CompositionMode_Clear)
    p.drawEllipse(QRectF(c - r_hole, c - r_hole, 2 * r_hole, 2 * r_hole))

    p.end()
    return QIcon(px)


def icon_pencil(color: str, size: int = 16) -> QIcon:
    """Matita diagonale — azione Modifica."""
    from PyQt6.QtCore import QPointF
    from PyQt6.QtGui import QPolygonF
    px, p = _px(size, color)
    s = float(size)
    body = QPolygonF([
        QPointF(s * 0.75, s * 0.05),
        QPointF(s * 0.95, s * 0.25),
        QPointF(s * 0.35, s * 0.88),
        QPointF(s * 0.15, s * 0.68),
    ])
    p.drawPolygon(body)
    tip = QPolygonF([
        QPointF(s * 0.15, s * 0.68),
        QPointF(s * 0.35, s * 0.88),
        QPointF(s * 0.05, s * 0.97),
    ])
    p.drawPolygon(tip)
    p.end()
    return QIcon(px)


def icon_trash(color: str, size: int = 16) -> QIcon:
    """Cestino — azione Elimina."""
    from PyQt6.QtCore import QPointF
    from PyQt6.QtGui import QPolygonF
    px, p = _px(size, color)
    s = float(size)
    p.drawRoundedRect(QRectF(s * 0.35, s * 0.03, s * 0.30, s * 0.13), 1.0, 1.0)
    p.drawRoundedRect(QRectF(s * 0.08, s * 0.17, s * 0.84, s * 0.11), 1.0, 1.0)
    body = QPolygonF([
        QPointF(s * 0.15, s * 0.30),
        QPointF(s * 0.85, s * 0.30),
        QPointF(s * 0.78, s * 0.97),
        QPointF(s * 0.22, s * 0.97),
    ])
    p.drawPolygon(body)
    p.setCompositionMode(QPainter.CompositionMode.CompositionMode_Clear)
    slot_w, slot_h, slot_y = s * 0.08, s * 0.48, s * 0.37
    p.drawRoundedRect(QRectF(s * 0.32, slot_y, slot_w, slot_h), 1.0, 1.0)
    p.drawRoundedRect(QRectF(s * 0.60, slot_y, slot_w, slot_h), 1.0, 1.0)
    p.end()
    return QIcon(px)


def icon_placeholder(color: str, size: int = 18) -> QIcon:
    """Cerchio pieno — icona generica per sezioni placeholder."""
    px, p = _px(size, color)
    m = size * 0.15
    p.drawEllipse(QRectF(m, m, size - 2 * m, size - 2 * m))
    p.end()
    return QIcon(px)
