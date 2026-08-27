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
