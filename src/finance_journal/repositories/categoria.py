import sqlite3

from finance_journal.db.schema import FALLBACK_NOME
from finance_journal.models import Categoria


class CategoriaRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def list(self) -> list[Categoria]:
        rows = self._conn.execute(
            "SELECT id, nome, predefinita FROM categorie ORDER BY predefinita DESC, nome"
        ).fetchall()
        return [Categoria(id=r["id"], nome=r["nome"], predefinita=bool(r["predefinita"])) for r in rows]

    def create(self, nome: str) -> Categoria:
        cur = self._conn.execute(
            "INSERT INTO categorie (nome, predefinita) VALUES (?, 0)", (nome,)
        )
        self._conn.commit()
        return Categoria(id=cur.lastrowid, nome=nome, predefinita=False)

    def count_in_uso(self, categoria_id: int) -> int:
        row = self._conn.execute(
            "SELECT COUNT(*) FROM movimenti WHERE categoria_id = ?", (categoria_id,)
        ).fetchone()
        return row[0]

    def delete(self, categoria_id: int) -> None:
        row = self._conn.execute(
            "SELECT predefinita FROM categorie WHERE id = ?", (categoria_id,)
        ).fetchone()
        if row is None:
            return
        if bool(row["predefinita"]):
            raise ValueError("Impossibile eliminare una categoria predefinita")

        altro = self._conn.execute(
            "SELECT id FROM categorie WHERE nome = ?", (FALLBACK_NOME,)
        ).fetchone()
        self._conn.execute(
            "UPDATE movimenti SET categoria_id = ? WHERE categoria_id = ?",
            (altro["id"], categoria_id),
        )
        self._conn.execute("DELETE FROM categorie WHERE id = ?", (categoria_id,))
        self._conn.commit()
