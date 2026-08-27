import sqlite3
from datetime import date, datetime

from finance_journal.models import Movimento, TipoMovimento, SezioneMovimento


class MovimentoRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def create_movimento(
        self,
        data: date,
        tipo: str,
        importo: float,
        categoria_id: int,
        metodo_id: int,
        sezione: str = "personale",
        nota: str = "",
        dettaglio_id: int | None = None,
    ) -> Movimento:
        cur = self._conn.execute(
            """INSERT INTO movimenti
               (data, tipo, importo, categoria_id, metodo_id, sezione, nota, dettaglio_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (data.isoformat(), tipo, importo, categoria_id, metodo_id, sezione, nota, dettaglio_id),
        )
        self._conn.commit()
        return self._fetch_by_id(cur.lastrowid)

    def list(
        self,
        sezione: str = "personale",
        anno: int | None = None,
        mese: int | None = None,
        tipo: str | None = None,
        categoria_id: int | None = None,
        metodo_id: int | None = None,
        testo: str | None = None,
    ) -> list[Movimento]:
        clauses = ["sezione = ?"]
        params: list = [sezione]

        if anno is not None:
            clauses.append("strftime('%Y', data) = ?")
            params.append(str(anno))
        if mese is not None:
            clauses.append("strftime('%m', data) = ?")
            params.append(f"{mese:02d}")
        if tipo is not None:
            clauses.append("tipo = ?")
            params.append(tipo)
        if categoria_id is not None:
            clauses.append("categoria_id = ?")
            params.append(categoria_id)
        if metodo_id is not None:
            clauses.append("metodo_id = ?")
            params.append(metodo_id)
        if testo is not None and testo.strip():
            clauses.append("nota LIKE ?")
            params.append(f"%{testo}%")

        where = " AND ".join(clauses)
        rows = self._conn.execute(
            f"SELECT * FROM movimenti WHERE {where} ORDER BY data DESC, id DESC",
            params,
        ).fetchall()
        return [self._row_to_movimento(r) for r in rows]

    def update_movimento(self, movimento_id: int, **campi) -> None:
        allowed = {"data", "tipo", "importo", "categoria_id", "metodo_id", "sezione", "nota", "dettaglio_id"}
        updates = {k: v for k, v in campi.items() if k in allowed}
        if not updates:
            return
        if "data" in updates and isinstance(updates["data"], date):
            updates["data"] = updates["data"].isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        self._conn.execute(
            f"UPDATE movimenti SET {set_clause} WHERE id = ?",
            [*updates.values(), movimento_id],
        )
        self._conn.commit()

    def delete_movimento(self, movimento_id: int) -> None:
        self._conn.execute("DELETE FROM movimenti WHERE id = ?", (movimento_id,))
        self._conn.commit()

    def delete_all(
        self,
        sezione: str = "personale",
        anno: int | None = None,
        mese: int | None = None,
        tipo: str | None = None,
        categoria_id: int | None = None,
        metodo_id: int | None = None,
        testo: str | None = None,
    ) -> None:
        clauses = ["sezione = ?"]
        params: list = [sezione]

        if anno is not None:
            clauses.append("strftime('%Y', data) = ?")
            params.append(str(anno))
        if mese is not None:
            clauses.append("strftime('%m', data) = ?")
            params.append(f"{mese:02d}")
        if tipo is not None:
            clauses.append("tipo = ?")
            params.append(tipo)
        if categoria_id is not None:
            clauses.append("categoria_id = ?")
            params.append(categoria_id)
        if metodo_id is not None:
            clauses.append("metodo_id = ?")
            params.append(metodo_id)
        if testo is not None and testo.strip():
            clauses.append("nota LIKE ?")
            params.append(f"%{testo}%")

        where = " AND ".join(clauses)
        self._conn.execute(f"DELETE FROM movimenti WHERE {where}", params)
        self._conn.commit()

    def list_anni(self, sezione: str = "personale") -> list[int]:
        rows = self._conn.execute(
            "SELECT DISTINCT CAST(strftime('%Y', data) AS INTEGER) AS anno"
            " FROM movimenti WHERE sezione = ? ORDER BY anno DESC",
            (sezione,),
        ).fetchall()
        return [r["anno"] for r in rows]

    def _fetch_by_id(self, movimento_id: int) -> Movimento:
        row = self._conn.execute(
            "SELECT * FROM movimenti WHERE id = ?", (movimento_id,)
        ).fetchone()
        return self._row_to_movimento(row)

    def _row_to_movimento(self, row: sqlite3.Row) -> Movimento:
        return Movimento(
            id=row["id"],
            data=date.fromisoformat(row["data"]),
            tipo=TipoMovimento(row["tipo"]),
            importo=row["importo"],
            categoria_id=row["categoria_id"],
            metodo_id=row["metodo_id"],
            sezione=SezioneMovimento(row["sezione"]),
            nota=row["nota"],
            dettaglio_id=row["dettaglio_id"],
            created_at=datetime.fromisoformat(row["created_at"]),
        )
