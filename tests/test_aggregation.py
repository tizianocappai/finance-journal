from datetime import date
import pytest

from finance_journal.models.movimento import Movimento
from finance_journal.models.enums import TipoMovimento, SezioneMovimento
from finance_journal.aggregation import (
    kpi_annuali,
    breakdown_mensile,
    breakdown_categorie,
    trend_annuale,
    riepilogo_mensile,
    pivot_categorie,
)


# --- helpers ---

def mov(anno: int, mese: int, tipo: str, importo: float, categoria_id: int = 1, metodo_id: int = 1) -> Movimento:
    return Movimento(
        data=date(anno, mese, 1),
        tipo=TipoMovimento(tipo),
        importo=importo,
        categoria_id=categoria_id,
        metodo_id=metodo_id,
        sezione=SezioneMovimento.PERSONALE,
    )


# ─── kpi_annuali ─────────────────────────────────────────────────────────────

class TestKpiAnnuali:

    def test_anno_senza_movimenti(self):
        result = kpi_annuali([], 2024)
        assert result["entrate"] == 0.0
        assert result["uscite"] == 0.0
        assert result["saldo"] == 0.0
        assert result["mesi_in_rosso"] == 0

    def test_entrate_e_uscite(self):
        movimenti = [
            mov(2024, 1, "entrata", 1000.0),
            mov(2024, 1, "uscita", 400.0),
            mov(2024, 2, "uscita", 300.0),
        ]
        result = kpi_annuali(movimenti, 2024)
        assert result["entrate"] == 1000.0
        assert result["uscite"] == 700.0
        assert result["saldo"] == 300.0

    def test_filtra_anno_diverso(self):
        movimenti = [
            mov(2023, 6, "entrata", 500.0),
            mov(2024, 1, "entrata", 1000.0),
        ]
        result = kpi_annuali(movimenti, 2024)
        assert result["entrate"] == 1000.0

    def test_mesi_in_rosso(self):
        movimenti = [
            mov(2024, 1, "entrata", 1000.0),
            mov(2024, 1, "uscita", 400.0),   # gen: verde
            mov(2024, 2, "uscita", 600.0),   # feb: rosso (0 entrate)
            mov(2024, 3, "entrata", 100.0),
            mov(2024, 3, "uscita", 200.0),   # mar: rosso
        ]
        result = kpi_annuali(movimenti, 2024)
        assert result["mesi_in_rosso"] == 2

    def test_saldo_iniziale_senza_data(self):
        result = kpi_annuali([], 2024, saldo_iniziale=500.0)
        assert result["saldo"] == 500.0

    def test_saldo_iniziale_data_anno_corrente(self):
        result = kpi_annuali(
            [], 2024,
            saldo_iniziale=500.0,
            saldo_iniziale_data=date(2024, 6, 1),
        )
        assert result["saldo"] == 500.0

    def test_saldo_iniziale_data_anno_precedente(self):
        # data nell'anno precedente → incluso (cumulativo)
        result = kpi_annuali(
            [], 2024,
            saldo_iniziale=500.0,
            saldo_iniziale_data=date(2023, 12, 31),
        )
        assert result["saldo"] == 500.0

    def test_saldo_iniziale_data_futuro(self):
        # data dopo l'anno considerato → NON incluso
        result = kpi_annuali(
            [], 2024,
            saldo_iniziale=500.0,
            saldo_iniziale_data=date(2025, 1, 1),
        )
        assert result["saldo"] == 0.0

    def test_saldo_include_movimenti_e_saldo_iniziale(self):
        movimenti = [mov(2024, 1, "entrata", 200.0)]
        result = kpi_annuali(movimenti, 2024, saldo_iniziale=100.0)
        assert result["saldo"] == 300.0


# ─── breakdown_mensile ────────────────────────────────────────────────────────

class TestBreakdownMensile:

    def test_anno_senza_movimenti_12_mesi_zero(self):
        result = breakdown_mensile([], 2024)
        assert len(result) == 12
        for item in result:
            assert item["entrate"] == 0.0
            assert item["uscite"] == 0.0

    def test_mesi_numerati_1_a_12(self):
        result = breakdown_mensile([], 2024)
        mesi = [item["mese"] for item in result]
        assert mesi == list(range(1, 13))

    def test_mese_senza_movimenti_restituisce_zero_non_assente(self):
        movimenti = [mov(2024, 1, "entrata", 100.0)]
        result = breakdown_mensile(movimenti, 2024)
        feb = result[1]  # index 1 = mese 2
        assert feb["mese"] == 2
        assert feb["entrate"] == 0.0
        assert feb["uscite"] == 0.0

    def test_aggregazione_per_mese(self):
        movimenti = [
            mov(2024, 3, "entrata", 500.0),
            mov(2024, 3, "entrata", 300.0),
            mov(2024, 3, "uscita", 200.0),
        ]
        result = breakdown_mensile(movimenti, 2024)
        mar = result[2]  # index 2 = mese 3
        assert mar["entrate"] == 800.0
        assert mar["uscite"] == 200.0

    def test_filtra_anno_diverso(self):
        movimenti = [
            mov(2023, 5, "entrata", 999.0),
            mov(2024, 5, "entrata", 100.0),
        ]
        result = breakdown_mensile(movimenti, 2024)
        mag = result[4]  # mese 5
        assert mag["entrate"] == 100.0


# ─── breakdown_categorie ──────────────────────────────────────────────────────

class TestBreakdownCategorie:

    def test_solo_uscite(self):
        movimenti = [
            mov(2024, 1, "entrata", 1000.0, categoria_id=1),
            mov(2024, 1, "uscita", 300.0, categoria_id=2),
        ]
        categorie = {1: "Stipendio", 2: "Spesa"}
        result = breakdown_categorie(movimenti, 2024, categorie)
        nomi = [r["nome"] for r in result]
        assert "Stipendio" not in nomi
        assert "Spesa" in nomi

    def test_ordine_decrescente(self):
        movimenti = [
            mov(2024, 1, "uscita", 100.0, categoria_id=1),
            mov(2024, 1, "uscita", 500.0, categoria_id=2),
            mov(2024, 1, "uscita", 250.0, categoria_id=3),
        ]
        categorie = {1: "Trasporti", 2: "Affitto", 3: "Cibo"}
        result = breakdown_categorie(movimenti, 2024, categorie)
        totali = [r["totale"] for r in result]
        assert totali == sorted(totali, reverse=True)

    def test_aggregazione_stessa_categoria(self):
        movimenti = [
            mov(2024, 1, "uscita", 100.0, categoria_id=5),
            mov(2024, 2, "uscita", 250.0, categoria_id=5),
        ]
        categorie = {5: "Bollette"}
        result = breakdown_categorie(movimenti, 2024, categorie)
        assert len(result) == 1
        assert result[0]["totale"] == 350.0

    def test_nessuna_uscita(self):
        movimenti = [mov(2024, 1, "entrata", 1000.0, categoria_id=1)]
        result = breakdown_categorie(movimenti, 2024, {1: "Stipendio"})
        assert result == []

    def test_filtra_anno_diverso(self):
        movimenti = [
            mov(2023, 1, "uscita", 999.0, categoria_id=1),
            mov(2024, 1, "uscita", 100.0, categoria_id=1),
        ]
        result = breakdown_categorie(movimenti, 2024, {1: "Spesa"})
        assert result[0]["totale"] == 100.0


# ─── trend_annuale ────────────────────────────────────────────────────────────

class TestTrendAnnuale:

    def test_struttura_chiavi(self):
        result = trend_annuale([], 2024)
        assert "corrente" in result
        assert "precedente" in result

    def test_12_elementi_corrente_e_precedente(self):
        result = trend_annuale([], 2024)
        assert len(result["corrente"]) == 12
        assert len(result["precedente"]) == 12

    def test_anno_precedente_senza_dati_tutti_zero(self):
        movimenti = [mov(2024, 3, "entrata", 500.0)]
        result = trend_annuale(movimenti, 2024)
        for item in result["precedente"]:
            assert item["entrate"] == 0.0
            assert item["uscite"] == 0.0

    def test_anno_corrente_dati_corretti(self):
        movimenti = [mov(2024, 6, "uscita", 300.0)]
        result = trend_annuale(movimenti, 2024)
        giu = result["corrente"][5]  # index 5 = mese 6
        assert giu["uscite"] == 300.0

    def test_anno_precedente_dati_corretti(self):
        movimenti = [
            mov(2023, 4, "entrata", 1200.0),
            mov(2024, 4, "entrata", 800.0),
        ]
        result = trend_annuale(movimenti, 2024)
        apr_prec = result["precedente"][3]  # index 3 = mese 4
        apr_corr = result["corrente"][3]
        assert apr_prec["entrate"] == 1200.0
        assert apr_corr["entrate"] == 800.0


# ─── riepilogo_mensile ────────────────────────────────────────────────────────

class TestRiepilogoMensile:

    def test_restituisce_15_elementi(self):
        result = riepilogo_mensile([], 2024)
        assert len(result) == 15

    def test_12_mesi_piu_3_footer(self):
        result = riepilogo_mensile([], 2024)
        mesi = [r for r in result if "mese" in r]
        footer = [r for r in result if "tipo" in r]
        assert len(mesi) == 12
        assert len(footer) == 3
        assert {f["tipo"] for f in footer} == {"totale", "media", "mediana"}

    def test_mese_senza_movimenti_valori_zero(self):
        movimenti = [mov(2024, 1, "entrata", 500.0)]
        result = riepilogo_mensile(movimenti, 2024)
        feb = result[1]  # febbraio senza movimenti
        assert feb["mese"] == 2
        assert feb["entrate"] == 0.0
        assert feb["uscite"] == 0.0
        assert feb["saldo"] == 0.0

    def test_delta_gennaio_e_none(self):
        movimenti = [mov(2024, 1, "entrata", 1000.0)]
        result = riepilogo_mensile(movimenti, 2024)
        assert result[0]["delta"] is None

    def test_delta_mese_successivo(self):
        movimenti = [
            mov(2024, 1, "entrata", 1000.0),
            mov(2024, 2, "entrata", 1200.0),
        ]
        result = riepilogo_mensile(movimenti, 2024)
        # gen saldo=1000, feb saldo=1200, delta_feb = 1200-1000 = 200
        assert result[0]["saldo"] == 1000.0
        assert result[1]["saldo"] == 1200.0
        assert result[1]["delta"] == pytest.approx(200.0)

    def test_saldo_entrate_meno_uscite(self):
        movimenti = [
            mov(2024, 3, "entrata", 500.0),
            mov(2024, 3, "uscita", 200.0),
        ]
        result = riepilogo_mensile(movimenti, 2024)
        assert result[2]["saldo"] == pytest.approx(300.0)

    def test_anno_senza_movimenti_footer_zero(self):
        result = riepilogo_mensile([], 2024)
        footer = {r["tipo"]: r for r in result if "tipo" in r}
        assert footer["totale"]["entrate"] == 0.0
        assert footer["media"]["saldo"] == 0.0
        assert footer["mediana"]["uscite"] == 0.0

    def test_media_esclude_mesi_senza_movimenti(self):
        # solo gen e feb attivi
        movimenti = [
            mov(2024, 1, "entrata", 300.0),
            mov(2024, 2, "entrata", 100.0),
        ]
        result = riepilogo_mensile(movimenti, 2024)
        footer = {r["tipo"]: r for r in result if "tipo" in r}
        # media entrate = (300+100)/2 = 200
        assert footer["media"]["entrate"] == pytest.approx(200.0)

    def test_mediana_esclude_mesi_senza_movimenti(self):
        movimenti = [
            mov(2024, 1, "entrata", 100.0),
            mov(2024, 2, "entrata", 200.0),
            mov(2024, 3, "entrata", 300.0),
        ]
        result = riepilogo_mensile(movimenti, 2024)
        footer = {r["tipo"]: r for r in result if "tipo" in r}
        # mediana di [100, 200, 300] = 200
        assert footer["mediana"]["entrate"] == pytest.approx(200.0)

    def test_filtra_anno_diverso(self):
        movimenti = [
            mov(2023, 6, "entrata", 999.0),
            mov(2024, 6, "entrata", 100.0),
        ]
        result = riepilogo_mensile(movimenti, 2024)
        footer = {r["tipo"]: r for r in result if "tipo" in r}
        assert footer["totale"]["entrate"] == pytest.approx(100.0)


# ─── pivot_categorie ──────────────────────────────────────────────────────────

class TestPivotCategorie:

    def test_anno_senza_movimenti(self):
        result = pivot_categorie([], 2024, "uscita", {})
        assert result["categorie"] == []
        assert len(result["totali_mensili"]) == 12
        assert all(v is None for v in result["totali_mensili"])

    def test_categorie_senza_movimenti_nell_anno_non_incluse(self):
        movimenti = [mov(2023, 1, "uscita", 100.0, categoria_id=1)]
        result = pivot_categorie(movimenti, 2024, "uscita", {1: "Spesa"})
        assert result["categorie"] == []

    def test_filtro_tipo_entrata(self):
        movimenti = [
            mov(2024, 1, "entrata", 1000.0, categoria_id=1),
            mov(2024, 1, "uscita", 200.0, categoria_id=2),
        ]
        result = pivot_categorie(movimenti, 2024, "entrata", {1: "Stipendio", 2: "Spesa"})
        nomi = [c["nome"] for c in result["categorie"]]
        assert "Stipendio" in nomi
        assert "Spesa" not in nomi

    def test_ordine_decrescente_per_totale(self):
        movimenti = [
            mov(2024, 1, "uscita", 100.0, categoria_id=1),
            mov(2024, 1, "uscita", 500.0, categoria_id=2),
            mov(2024, 1, "uscita", 250.0, categoria_id=3),
        ]
        categorie = {1: "A", 2: "B", 3: "C"}
        result = pivot_categorie(movimenti, 2024, "uscita", categorie)
        totali = [c["totale_annuale"] for c in result["categorie"]]
        assert totali == sorted(totali, reverse=True)

    def test_celle_mesi_senza_movimenti_sono_none(self):
        movimenti = [mov(2024, 3, "uscita", 100.0, categoria_id=1)]
        result = pivot_categorie(movimenti, 2024, "uscita", {1: "Spesa"})
        cat = result["categorie"][0]
        assert cat["mesi"][2] == pytest.approx(100.0)  # marzo = index 2
        assert cat["mesi"][0] is None  # gennaio vuoto

    def test_totali_mensili_none_dove_nessuna_categoria(self):
        movimenti = [mov(2024, 6, "uscita", 100.0, categoria_id=1)]
        result = pivot_categorie(movimenti, 2024, "uscita", {1: "Spesa"})
        assert result["totali_mensili"][5] == pytest.approx(100.0)  # giugno
        assert result["totali_mensili"][0] is None  # gennaio

    def test_media_mediana_riga_esclude_none(self):
        movimenti = [
            mov(2024, 1, "uscita", 100.0, categoria_id=1),
            mov(2024, 2, "uscita", 300.0, categoria_id=1),
        ]
        result = pivot_categorie(movimenti, 2024, "uscita", {1: "Spesa"})
        cat = result["categorie"][0]
        assert cat["media"] == pytest.approx(200.0)   # (100+300)/2
        assert cat["mediana"] == pytest.approx(200.0)

    def test_piu_categorie_miste(self):
        movimenti = [
            mov(2024, 1, "uscita", 200.0, categoria_id=1),
            mov(2024, 1, "uscita", 50.0, categoria_id=2),
            mov(2024, 2, "uscita", 300.0, categoria_id=1),
        ]
        categorie = {1: "Affitto", 2: "Cibo"}
        result = pivot_categorie(movimenti, 2024, "uscita", categorie)
        assert len(result["categorie"]) == 2
        # Affitto: 200+300=500, Cibo: 50 → ordine: Affitto, Cibo
        assert result["categorie"][0]["nome"] == "Affitto"
        assert result["categorie"][1]["nome"] == "Cibo"
        # totali_mensili gen: 200+50=250
        assert result["totali_mensili"][0] == pytest.approx(250.0)
