import sqlite3

from finance_journal.db.schema import FALLBACK_NOME
from finance_journal.models import MetodoPagamento


class MetodoPagamentoRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def list(self) -> list[MetodoPagamento]:
        rows = self._conn.execute(
            "SELECT id, nome, predefinito FROM metodi_pagamento ORDER BY predefinito DESC, nome"
        ).fetchall()
        return [
            MetodoPagamento(id=r["id"], nome=r["nome"], predefinito=bool(r["predefinito"]))
            for r in rows
        ]

    def create(self, nome: str) -> MetodoPagamento:
        cur = self._conn.execute(
            "INSERT INTO metodi_pagamento (nome, predefinito) VALUES (?, 0)", (nome,)
        )
        self._conn.commit()
        return MetodoPagamento(id=cur.lastrowid, nome=nome, predefinito=False)

    def delete(self, metodo_id: int) -> None:
        row = self._conn.execute(
            "SELECT predefinito FROM metodi_pagamento WHERE id = ?", (metodo_id,)
        ).fetchone()
        if row is None:
            return
        if bool(row["predefinito"]):
            raise ValueError("Impossibile eliminare un metodo di pagamento predefinito")

        altro = self._conn.execute(
            "SELECT id FROM metodi_pagamento WHERE nome = ?", (FALLBACK_NOME,)
        ).fetchone()
        self._conn.execute(
            "UPDATE movimenti SET metodo_id = ? WHERE metodo_id = ?",
            (altro["id"], metodo_id),
        )
        self._conn.execute("DELETE FROM metodi_pagamento WHERE id = ?", (metodo_id,))
        self._conn.commit()
