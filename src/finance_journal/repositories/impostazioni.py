import sqlite3
from datetime import date


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

    def get_saldo_iniziale(self) -> tuple[float, date | None]:
        importo = 0.0
        importo_str = self.get("saldo_iniziale_importo")
        if importo_str:
            try:
                importo = float(importo_str)
            except ValueError:
                pass
        saldo_data: date | None = None
        data_str = self.get("saldo_iniziale_data")
        if data_str:
            try:
                saldo_data = date.fromisoformat(data_str)
            except ValueError:
                pass
        return importo, saldo_data
