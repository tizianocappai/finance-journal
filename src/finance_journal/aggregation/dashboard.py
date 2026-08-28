import statistics
from datetime import date

from finance_journal.models.movimento import Movimento
from finance_journal.models.enums import TipoMovimento


def kpi_annuali(
    movimenti: list[Movimento],
    anno: int,
    saldo_iniziale: float = 0.0,
    saldo_iniziale_data: date | None = None,
) -> dict:
    anno_movimenti = [m for m in movimenti if m.data.year == anno]

    entrate = sum(m.importo for m in anno_movimenti if m.tipo == TipoMovimento.ENTRATA)
    uscite = sum(m.importo for m in anno_movimenti if m.tipo == TipoMovimento.USCITA)

    # saldo_iniziale incluso se data è None oppure <= 31 dic dell'anno considerato
    fine_anno = date(anno, 12, 31)
    includi_saldo = saldo_iniziale_data is None or saldo_iniziale_data <= fine_anno
    contributo_saldo = saldo_iniziale if includi_saldo else 0.0

    saldo = entrate - uscite + contributo_saldo

    # mesi in rosso: mesi dove uscite > entrate
    mesi_in_rosso = 0
    for mese in range(1, 13):
        mese_movimenti = [m for m in anno_movimenti if m.data.month == mese]
        if not mese_movimenti:
            continue
        e_mese = sum(m.importo for m in mese_movimenti if m.tipo == TipoMovimento.ENTRATA)
        u_mese = sum(m.importo for m in mese_movimenti if m.tipo == TipoMovimento.USCITA)
        if u_mese > e_mese:
            mesi_in_rosso += 1

    return {
        "entrate": entrate,
        "uscite": uscite,
        "saldo": saldo,
        "mesi_in_rosso": mesi_in_rosso,
    }


def breakdown_mensile(movimenti: list[Movimento], anno: int) -> list[dict]:
    anno_movimenti = [m for m in movimenti if m.data.year == anno]

    result = []
    for mese in range(1, 13):
        mese_movimenti = [m for m in anno_movimenti if m.data.month == mese]
        entrate = sum(m.importo for m in mese_movimenti if m.tipo == TipoMovimento.ENTRATA)
        uscite = sum(m.importo for m in mese_movimenti if m.tipo == TipoMovimento.USCITA)
        result.append({"mese": mese, "entrate": entrate, "uscite": uscite})

    return result


def breakdown_categorie(
    movimenti: list[Movimento],
    anno: int,
    categorie: dict[int, str],
) -> list[dict]:
    uscite = [
        m for m in movimenti
        if m.data.year == anno and m.tipo == TipoMovimento.USCITA
    ]

    totali: dict[int, float] = {}
    for m in uscite:
        totali[m.categoria_id] = totali.get(m.categoria_id, 0.0) + m.importo

    result = [
        {"nome": categorie.get(cat_id, str(cat_id)), "totale": totale}
        for cat_id, totale in totali.items()
    ]

    result.sort(key=lambda x: x["totale"], reverse=True)
    return result


def trend_annuale(movimenti: list[Movimento], anno: int) -> dict:
    return {
        "corrente": breakdown_mensile(movimenti, anno),
        "precedente": breakdown_mensile(movimenti, anno - 1),
    }


def riepilogo_mensile(movimenti: list[Movimento], anno: int) -> list[dict]:
    base = breakdown_mensile(movimenti, anno)

    result: list[dict] = []
    prev_saldo: float | None = None
    for item in base:
        saldo = item["entrate"] - item["uscite"]
        delta = None if prev_saldo is None else saldo - prev_saldo
        result.append({
            "mese": item["mese"],
            "entrate": item["entrate"],
            "uscite": item["uscite"],
            "saldo": saldo,
            "delta": delta,
        })
        prev_saldo = saldo

    mesi_attivi = [r for r in result if r["entrate"] != 0 or r["uscite"] != 0]

    tot_e = sum(r["entrate"] for r in result)
    tot_u = sum(r["uscite"] for r in result)
    tot_s = sum(r["saldo"] for r in result)

    if mesi_attivi:
        media_e = statistics.mean([r["entrate"] for r in mesi_attivi])
        media_u = statistics.mean([r["uscite"] for r in mesi_attivi])
        media_s = statistics.mean([r["saldo"] for r in mesi_attivi])
        mediana_e = statistics.median([r["entrate"] for r in mesi_attivi])
        mediana_u = statistics.median([r["uscite"] for r in mesi_attivi])
        mediana_s = statistics.median([r["saldo"] for r in mesi_attivi])
    else:
        media_e = media_u = media_s = 0.0
        mediana_e = mediana_u = mediana_s = 0.0

    result.append({"tipo": "totale", "entrate": tot_e, "uscite": tot_u, "saldo": tot_s})
    result.append({"tipo": "media", "entrate": media_e, "uscite": media_u, "saldo": media_s})
    result.append({"tipo": "mediana", "entrate": mediana_e, "uscite": mediana_u, "saldo": mediana_s})

    return result


def pivot_categorie(
    movimenti: list[Movimento],
    anno: int,
    tipo: str,
    categorie: dict[int, str],
) -> dict:
    tipo_enum = TipoMovimento(tipo)
    filtered = [m for m in movimenti if m.data.year == anno and m.tipo == tipo_enum]

    cat_ids = sorted({m.categoria_id for m in filtered})

    cat_list: list[dict] = []
    for cat_id in cat_ids:
        cat_movs = [m for m in filtered if m.categoria_id == cat_id]
        mesi: list[float | None] = []
        for mese in range(1, 13):
            mese_movs = [m for m in cat_movs if m.data.month == mese]
            mesi.append(sum(m.importo for m in mese_movs) if mese_movs else None)

        con_dati = [v for v in mesi if v is not None]
        totale_annuale = sum(con_dati)
        media = statistics.mean(con_dati) if con_dati else 0.0
        mediana = statistics.median(con_dati) if con_dati else 0.0

        cat_list.append({
            "nome": categorie.get(cat_id, str(cat_id)),
            "totale_annuale": totale_annuale,
            "media": media,
            "mediana": mediana,
            "mesi": mesi,
        })

    cat_list.sort(key=lambda x: x["totale_annuale"], reverse=True)

    totali_mensili: list[float | None] = []
    media_mensile: list[float | None] = []
    mediana_mensile: list[float | None] = []

    for mese_idx in range(12):
        valori = [c["mesi"][mese_idx] for c in cat_list if c["mesi"][mese_idx] is not None]
        if valori:
            totali_mensili.append(sum(valori))
            media_mensile.append(statistics.mean(valori))
            mediana_mensile.append(statistics.median(valori))
        else:
            totali_mensili.append(None)
            media_mensile.append(None)
            mediana_mensile.append(None)

    return {
        "categorie": cat_list,
        "totali_mensili": totali_mensili,
        "media_mensile": media_mensile,
        "mediana_mensile": mediana_mensile,
    }
