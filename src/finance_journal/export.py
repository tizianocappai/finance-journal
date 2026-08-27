from __future__ import annotations

import csv
import json
import sqlite3
from pathlib import Path

_QUERY = """
SELECT
    m.data        AS Data,
    m.tipo        AS tipo_raw,
    m.importo     AS importo_raw,
    c.nome        AS Categoria,
    mp.nome       AS "Metodo di pagamento",
    m.nota        AS Nota
FROM movimenti m
JOIN categorie c ON m.categoria_id = c.id
JOIN metodi_pagamento mp ON m.metodo_id = mp.id
WHERE m.sezione = ?
ORDER BY m.data DESC, m.id DESC
"""

_FIELDNAMES = ["Data", "Tipo", "Importo", "Categoria", "Metodo di pagamento", "Nota"]


def _rows(conn: sqlite3.Connection, sezione: str) -> list[dict]:
    raw = conn.execute(_QUERY, (sezione,)).fetchall()
    result = []
    for r in raw:
        tipo_label = "Entrata" if r["tipo_raw"] == "entrata" else "Uscita"
        importo = r["importo_raw"] if r["tipo_raw"] == "entrata" else -r["importo_raw"]
        result.append({
            "Data": r["Data"],
            "Tipo": tipo_label,
            "Importo": importo,
            "Categoria": r["Categoria"],
            "Metodo di pagamento": r["Metodo di pagamento"],
            "Nota": r["Nota"],
        })
    return result


def export_csv(conn: sqlite3.Connection, path: Path, sezione: str = "personale") -> None:
    rows = _rows(conn, sezione)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def export_json(conn: sqlite3.Connection, path: Path, sezione: str = "personale") -> None:
    rows = _rows(conn, sezione)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
