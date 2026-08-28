from __future__ import annotations

import csv
import logging
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

_DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]
_SEZIONE = "personale"

logger = logging.getLogger(__name__)


class ImportCSVError(Exception):
    pass


@dataclass
class RigaSaltata:
    numero: int
    motivo: str


@dataclass
class ImportResult:
    importati: int = 0
    saltati: list[RigaSaltata] = field(default_factory=list)
    create_categorie: list[str] = field(default_factory=list)
    create_dettagli: list[str] = field(default_factory=list)
    create_account: list[str] = field(default_factory=list)


@dataclass
class _Analysis:
    result: ImportResult
    valid_rows: list[dict]
    new_cats: dict[str, str]        # lower → original name
    new_accs: dict[str, str]        # lower → original name
    new_dets: dict[str, tuple[str, str]]  # lower → (original name, cat_lower)


def _detect_date_format(value: str) -> str | None:
    for fmt in _DATE_FORMATS:
        try:
            datetime.strptime(value, fmt)
            return fmt
        except ValueError:
            continue
    return None


def _analyse(conn: sqlite3.Connection, path: Path) -> _Analysis:
    result = ImportResult()

    with open(path, newline="", encoding="utf-8-sig") as f:
        sample = f.read(4096)
        f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(f, dialect=dialect)
        if reader.fieldnames is None:
            raise ImportCSVError("Il file CSV non contiene un header valido.")
        col_map = {name.lower(): name for name in reader.fieldnames}
        raw_rows = list(reader)

    def get_col(row: dict, key: str) -> str:
        actual = col_map.get(key.lower())
        return (row.get(actual) or "").strip() if actual else ""

    cat_by_name: dict[str, dict] = {
        r["nome"].lower(): {"id": r["id"], "nome": r["nome"]}
        for r in conn.execute("SELECT id, nome FROM categorie").fetchall()
    }
    acc_by_name: dict[str, dict] = {
        r["nome"].lower(): {"id": r["id"], "nome": r["nome"]}
        for r in conn.execute("SELECT id, nome FROM metodi_pagamento").fetchall()
    }
    det_by_name: dict[str, dict] = {
        r["nome"].lower(): {"id": r["id"], "nome": r["nome"], "categoria_id": r["categoria_id"]}
        for r in conn.execute("SELECT id, nome, categoria_id FROM dettagli").fetchall()
    }

    date_fmt: str | None = None
    new_cats: dict[str, str] = {}
    new_accs: dict[str, str] = {}
    new_dets: dict[str, tuple[str, str]] = {}
    valid_rows: list[dict] = []

    for i, raw in enumerate(raw_rows, start=2):
        tipo_str = get_col(raw, "tipo")
        importo_str = get_col(raw, "importo")
        categoria_str = get_col(raw, "categoria")
        account_str = get_col(raw, "account")
        data_str = get_col(raw, "data")
        dettaglio_str = get_col(raw, "dettaglio")
        nota_str = get_col(raw, "note")

        tipo_lower = tipo_str.lower()
        if tipo_lower not in ("entrata", "uscita"):
            motivo = f"Tipo non riconosciuto: '{tipo_str}'"
            result.saltati.append(RigaSaltata(i, motivo))
            logger.warning("Riga %d saltata: %s", i, motivo)
            continue

        try:
            importo = float(importo_str.replace(",", "."))
            if importo <= 0:
                raise ValueError
        except ValueError:
            motivo = f"Importo non valido: '{importo_str}'"
            result.saltati.append(RigaSaltata(i, motivo))
            logger.warning("Riga %d saltata: %s", i, motivo)
            continue

        if not categoria_str:
            motivo = "Categoria mancante"
            result.saltati.append(RigaSaltata(i, motivo))
            logger.warning("Riga %d saltata: %s", i, motivo)
            continue

        if date_fmt is None:
            date_fmt = _detect_date_format(data_str)
            if date_fmt is None:
                motivo = f"Data non riconoscibile: '{data_str}'"
                result.saltati.append(RigaSaltata(i, motivo))
                logger.warning("Riga %d saltata: %s", i, motivo)
                continue

        try:
            data = datetime.strptime(data_str, date_fmt).date()
        except ValueError:
            motivo = f"Data non valida: '{data_str}'"
            result.saltati.append(RigaSaltata(i, motivo))
            logger.warning("Riga %d saltata: %s", i, motivo)
            continue

        if not account_str:
            motivo = "Account mancante"
            result.saltati.append(RigaSaltata(i, motivo))
            logger.warning("Riga %d saltata: %s", i, motivo)
            continue

        cat_lower = categoria_str.lower()
        acc_lower = account_str.lower()
        det_lower = dettaglio_str.lower() if dettaglio_str else None

        if cat_lower not in cat_by_name and cat_lower not in new_cats:
            new_cats[cat_lower] = categoria_str
        if acc_lower not in acc_by_name and acc_lower not in new_accs:
            new_accs[acc_lower] = account_str
        if det_lower and det_lower not in det_by_name and det_lower not in new_dets:
            new_dets[det_lower] = (dettaglio_str, cat_lower)

        valid_rows.append({
            "data": data,
            "tipo": tipo_lower,
            "importo": importo,
            "categoria": cat_lower,
            "account": acc_lower,
            "dettaglio": det_lower,
            "nota": nota_str,
        })

    result.importati = len(valid_rows)
    result.create_categorie = list(new_cats.values())
    result.create_dettagli = [v[0] for v in new_dets.values()]
    result.create_account = list(new_accs.values())
    return _Analysis(result, valid_rows, new_cats, new_accs, new_dets)


def analyse_csv(conn: sqlite3.Connection, path: Path) -> ImportResult:
    return _analyse(conn, path).result


def import_csv(conn: sqlite3.Connection, path: Path) -> ImportResult:
    analysis = _analyse(conn, path)
    result = analysis.result

    if not analysis.valid_rows:
        result.importati = 0
        logger.warning("Import fallito: nessuna riga valida nel file CSV")
        return result

    cat_by_name: dict[str, dict] = {
        r["nome"].lower(): {"id": r["id"], "nome": r["nome"]}
        for r in conn.execute("SELECT id, nome FROM categorie").fetchall()
    }
    acc_by_name: dict[str, dict] = {
        r["nome"].lower(): {"id": r["id"], "nome": r["nome"]}
        for r in conn.execute("SELECT id, nome FROM metodi_pagamento").fetchall()
    }
    det_by_name: dict[str, dict] = {
        r["nome"].lower(): {"id": r["id"], "nome": r["nome"], "categoria_id": r["categoria_id"]}
        for r in conn.execute("SELECT id, nome, categoria_id FROM dettagli").fetchall()
    }

    result.importati = 0

    with conn:
        for lower, nome in analysis.new_cats.items():
            cur = conn.execute(
                "INSERT INTO categorie (nome, predefinita) VALUES (?, 0)", (nome,)
            )
            cat_by_name[lower] = {"id": cur.lastrowid, "nome": nome}

        for lower, nome in analysis.new_accs.items():
            cur = conn.execute(
                "INSERT INTO metodi_pagamento (nome, predefinito) VALUES (?, 0)", (nome,)
            )
            acc_by_name[lower] = {"id": cur.lastrowid, "nome": nome}

        for lower, (nome, cat_lower) in analysis.new_dets.items():
            cat_id = cat_by_name[cat_lower]["id"]
            cur = conn.execute(
                "INSERT INTO dettagli (nome, categoria_id, predefinita) VALUES (?, ?, 0)",
                (nome, cat_id),
            )
            det_by_name[lower] = {"id": cur.lastrowid, "nome": nome, "categoria_id": cat_id}

        for row in analysis.valid_rows:
            cat_id = cat_by_name[row["categoria"]]["id"]
            acc_id = acc_by_name[row["account"]]["id"]
            det_id = det_by_name[row["dettaglio"]]["id"] if row["dettaglio"] else None
            conn.execute(
                """INSERT INTO movimenti
                   (data, tipo, importo, categoria_id, metodo_id, sezione, nota, dettaglio_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (row["data"].isoformat(), row["tipo"], row["importo"],
                 cat_id, acc_id, _SEZIONE, row["nota"], det_id),
            )
            result.importati += 1

    logger.info(
        "Import completato: %d movimenti importati, %d righe saltate",
        result.importati,
        len(result.saltati),
    )
    return result
