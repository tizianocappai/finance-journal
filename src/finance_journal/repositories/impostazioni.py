import sqlite3


class ImpostazioniRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def get(self, chiave: str, default: str | None = None) -> str | None:
        row = self._conn.execute(
            "SELECT valore FROM impostazioni WHERE chiave = ?", (chiave,)
        ).fetchone()
        return row["valore"] if row is not None else default

    def set(self, chiave: str, valore: str) -> None:
        self._conn.execute(
            "INSERT INTO impostazioni (chiave, valore) VALUES (?, ?)"
            " ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore",
            (chiave, valore),
        )
        self._conn.commit()
