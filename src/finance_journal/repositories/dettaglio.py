import logging
import sqlite3

from finance_journal.models import Dettaglio

logger = logging.getLogger(__name__)


class DettaglioRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def list(self) -> list[Dettaglio]:
        rows = self._conn.execute(
            "SELECT id, nome, categoria_id, predefinita FROM dettagli ORDER BY nome COLLATE NOCASE"
        ).fetchall()
        return [
            Dettaglio(id=r["id"], nome=r["nome"], categoria_id=r["categoria_id"], predefinita=bool(r["predefinita"]))
            for r in rows
        ]

    def create(self, nome: str, categoria_id: int) -> Dettaglio:
        cur = self._conn.execute(
            "INSERT INTO dettagli (nome, categoria_id, predefinita) VALUES (?, ?, 0)",
            (nome, categoria_id),
        )
        self._conn.commit()
        logger.info("dettaglio '%s' creato (id=%d)", nome, cur.lastrowid)
        return Dettaglio(id=cur.lastrowid, nome=nome, categoria_id=categoria_id, predefinita=False)

    def count_in_uso(self, dettaglio_id: int) -> int:
        row = self._conn.execute(
            "SELECT COUNT(*) FROM movimenti WHERE dettaglio_id = ?", (dettaglio_id,)
        ).fetchone()
        return row[0]

    def update_categoria(self, dettaglio_id: int, categoria_id: int) -> None:
        self._conn.execute(
            "UPDATE dettagli SET categoria_id = ? WHERE id = ?",
            (categoria_id, dettaglio_id),
        )
        self._conn.commit()

    def delete(self, dettaglio_id: int) -> None:
        row = self._conn.execute(
            "SELECT predefinita FROM dettagli WHERE id = ?", (dettaglio_id,)
        ).fetchone()
        if row is None:
            return
        if bool(row["predefinita"]):
            raise ValueError("Impossibile eliminare un dettaglio predefinito")
        self._conn.execute(
            "UPDATE movimenti SET dettaglio_id = NULL WHERE dettaglio_id = ?",
            (dettaglio_id,),
        )
        self._conn.execute("DELETE FROM dettagli WHERE id = ?", (dettaglio_id,))
        self._conn.commit()
        logger.info("dettaglio #%d eliminato", dettaglio_id)
