import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../db/index';
import type Database from 'better-sqlite3';
import {
  getDashboardKPI,
  getSerieMensili,
  getBreakdownCategorie,
  getTrendYoY,
  getRiepilogoMensile,
  getPivotCategorie,
} from './dashboard';
import { createMovimento } from './movimenti';
import { listCategorie } from './categorie';
import { setImpostazione } from './impostazioni';

let db: Database.Database;

beforeEach(() => {
  db = initDatabase(':memory:');
});

afterEach(() => {
  db.close();
});

function seed() {
  const categorie = listCategorie(db);
  const cat1 = categorie.find((c) => c.nome === 'Alimentari')!;
  const cat2 = categorie.find((c) => c.nome === 'Utenze')!;

  // 2024: gen entrate 2000, uscite 500 → +1500 ok
  createMovimento(db, { data: '2024-01-15', importo: 2000, tipo: 'entrata' });
  createMovimento(db, { data: '2024-01-20', importo: 500, tipo: 'uscita', categoria_id: cat1.id });
  // 2024: feb solo uscite 300 → -300 rosso
  createMovimento(db, { data: '2024-02-10', importo: 300, tipo: 'uscita', categoria_id: cat2.id });
  // 2024: mar entrate 1500, uscite 800 → +700 ok
  createMovimento(db, { data: '2024-03-05', importo: 1500, tipo: 'entrata' });
  createMovimento(db, { data: '2024-03-15', importo: 800, tipo: 'uscita', categoria_id: cat1.id });

  // 2023: un mese, saldo positivo
  createMovimento(db, { data: '2023-06-01', importo: 1800, tipo: 'entrata' });
  createMovimento(db, { data: '2023-06-20', importo: 600, tipo: 'uscita', categoria_id: cat1.id });

  return { cat1, cat2 };
}

describe('getDashboardKPI', () => {
  it('restituisce zero per anno senza movimenti', () => {
    const kpi = getDashboardKPI(db, 2024);
    expect(kpi.entrate).toBe(0);
    expect(kpi.uscite).toBe(0);
    expect(kpi.saldo).toBe(0);
    expect(kpi.mesi_in_rosso).toBe(0);
  });

  it('calcola entrate, uscite e saldo', () => {
    seed();
    const kpi = getDashboardKPI(db, 2024);
    expect(kpi.entrate).toBe(3500);
    expect(kpi.uscite).toBe(1600);
    expect(kpi.saldo).toBe(1900);
  });

  it('conta mesi in rosso', () => {
    seed();
    const kpi = getDashboardKPI(db, 2024);
    // feb: solo uscite 300 → rosso
    expect(kpi.mesi_in_rosso).toBe(1);
  });

  it('isola i dati per anno', () => {
    seed();
    const kpi = getDashboardKPI(db, 2023);
    expect(kpi.entrate).toBe(1800);
    expect(kpi.uscite).toBe(600);
    expect(kpi.saldo).toBe(1200);
    expect(kpi.mesi_in_rosso).toBe(0);
  });

  it('include saldo_iniziale se data <= anno', () => {
    seed();
    setImpostazione(db, 'saldo_iniziale_importo', '1000');
    setImpostazione(db, 'saldo_iniziale_data', '2023-01-01');
    const kpi = getDashboardKPI(db, 2024);
    // saldo transazioni 2024 = 1900, + saldo_iniziale 1000 = 2900
    expect(kpi.saldo).toBe(2900);
    expect(kpi.entrate).toBe(3500);
    expect(kpi.uscite).toBe(1600);
  });

  it('NON include saldo_iniziale se data > anno', () => {
    seed();
    setImpostazione(db, 'saldo_iniziale_importo', '1000');
    setImpostazione(db, 'saldo_iniziale_data', '2025-06-01');
    const kpi = getDashboardKPI(db, 2024);
    expect(kpi.saldo).toBe(1900);
  });

  it('saldo invariato senza saldo_iniziale impostato', () => {
    seed();
    const kpi = getDashboardKPI(db, 2024);
    expect(kpi.saldo).toBe(1900);
  });

  it('include saldo_iniziale se anno data == anno', () => {
    seed();
    setImpostazione(db, 'saldo_iniziale_importo', '500');
    setImpostazione(db, 'saldo_iniziale_data', '2024-12-31');
    const kpi = getDashboardKPI(db, 2024);
    expect(kpi.saldo).toBe(2400);
  });
});

describe('getSerieMensili', () => {
  it('restituisce lista vuota per anno senza movimenti', () => {
    expect(getSerieMensili(db, 2024)).toHaveLength(0);
  });

  it('restituisce 12 mesi se anno ha movimenti', () => {
    seed();
    const serie = getSerieMensili(db, 2024);
    expect(serie).toHaveLength(12);
  });

  it('mesi senza movimenti hanno entrate e uscite a zero', () => {
    seed();
    const serie = getSerieMensili(db, 2024);
    // Aprile non ha movimenti nella fixture
    const apr = serie.find((s) => s.mese === 4)!;
    expect(apr.entrate).toBe(0);
    expect(apr.uscite).toBe(0);
  });

  it('calcola entrate e uscite per mese con dati', () => {
    seed();
    const serie = getSerieMensili(db, 2024);
    const gen = serie.find((s) => s.mese === 1)!;
    expect(gen.entrate).toBe(2000);
    expect(gen.uscite).toBe(500);

    const feb = serie.find((s) => s.mese === 2)!;
    expect(feb.entrate).toBe(0);
    expect(feb.uscite).toBe(300);
  });

  it('imposta nome_mese corretto', () => {
    seed();
    const serie = getSerieMensili(db, 2024);
    expect(serie[0].nome_mese).toBe('Gen');
    expect(serie[1].nome_mese).toBe('Feb');
    expect(serie[2].nome_mese).toBe('Mar');
  });

  it('ordina per mese crescente', () => {
    seed();
    const serie = getSerieMensili(db, 2024);
    const mesi = serie.map((s) => s.mese);
    expect(mesi).toEqual([...mesi].sort((a, b) => a - b));
  });
});

describe('getBreakdownCategorie', () => {
  it('restituisce lista vuota senza uscite', () => {
    createMovimento(db, { data: '2024-01-01', importo: 100, tipo: 'entrata' });
    expect(getBreakdownCategorie(db, 2024)).toHaveLength(0);
  });

  it('raggruppa uscite per categoria', () => {
    seed();
    const breakdown = getBreakdownCategorie(db, 2024);
    const ali = breakdown.find((b) => b.categoria_nome === 'Alimentari');
    expect(ali?.totale).toBe(1300); // 500 + 800
    const utenze = breakdown.find((b) => b.categoria_nome === 'Utenze');
    expect(utenze?.totale).toBe(300);
  });

  it('ordina per totale decrescente', () => {
    seed();
    const breakdown = getBreakdownCategorie(db, 2024);
    for (let i = 1; i < breakdown.length; i++) {
      expect(breakdown[i - 1].totale).toBeGreaterThanOrEqual(breakdown[i].totale);
    }
  });

  it('include uscite senza categoria', () => {
    createMovimento(db, { data: '2024-01-10', importo: 75, tipo: 'uscita' });
    const breakdown = getBreakdownCategorie(db, 2024);
    const senza = breakdown.find((b) => b.categoria_nome === 'Senza categoria');
    expect(senza?.totale).toBe(75);
  });

  it('esclude le entrate', () => {
    seed();
    const breakdown = getBreakdownCategorie(db, 2024);
    const totale = breakdown.reduce((acc, b) => acc + b.totale, 0);
    expect(totale).toBe(1600); // solo uscite
  });
});

describe('getTrendYoY', () => {
  it('calcola delta percentuale rispetto anno precedente', () => {
    seed();
    const trend = getTrendYoY(db, 2024);
    expect(trend.entrate_anno_corrente).toBe(3500);
    expect(trend.entrate_anno_precedente).toBe(1800);
    expect(trend.uscite_anno_corrente).toBe(1600);
    expect(trend.uscite_anno_precedente).toBe(600);
    expect(trend.delta_entrate_pct).toBeCloseTo(((3500 - 1800) / 1800) * 100, 1);
    expect(trend.delta_uscite_pct).toBeCloseTo(((1600 - 600) / 600) * 100, 1);
  });

  it('restituisce null per delta se anno precedente ha valore zero', () => {
    createMovimento(db, { data: '2024-01-10', importo: 100, tipo: 'entrata' });
    const trend = getTrendYoY(db, 2024);
    // 2023 ha entrate=0 e uscite=0
    expect(trend.delta_entrate_pct).toBeNull();
    expect(trend.delta_uscite_pct).toBeNull();
  });

  it('calcola saldo corrente e precedente', () => {
    seed();
    const trend = getTrendYoY(db, 2024);
    expect(trend.saldo_anno_corrente).toBe(1900);
    expect(trend.saldo_anno_precedente).toBe(1200);
  });

  it('include delta_mesi_in_rosso come differenza assoluta', () => {
    seed();
    const trend = getTrendYoY(db, 2024);
    // 2024: 1 mese in rosso, 2023: 0 → delta = +1
    expect(trend.mesi_in_rosso_anno_corrente).toBe(1);
    expect(trend.mesi_in_rosso_anno_precedente).toBe(0);
    expect(trend.delta_mesi_in_rosso).toBe(1);
  });

  it('restituisce null per delta_mesi_in_rosso se entrambi zero', () => {
    createMovimento(db, { data: '2024-01-10', importo: 100, tipo: 'entrata' });
    const trend = getTrendYoY(db, 2024);
    expect(trend.delta_mesi_in_rosso).toBeNull();
  });
});

describe('getRiepilogoMensile', () => {
  it('restituisce sempre 12 righe anche senza movimenti', () => {
    const result = getRiepilogoMensile(db, 2024);
    expect(result.righe).toHaveLength(12);
  });

  it('mese senza movimenti ha tutti i valori a zero', () => {
    const result = getRiepilogoMensile(db, 2024);
    result.righe.forEach((r) => {
      expect(r.entrate).toBe(0);
      expect(r.uscite).toBe(0);
      expect(r.saldo).toBe(0);
    });
  });

  it('delta primo mese è null', () => {
    seed();
    const result = getRiepilogoMensile(db, 2024);
    expect(result.righe[0].delta).toBeNull();
  });

  it('calcola saldo mensile corretto', () => {
    seed();
    const result = getRiepilogoMensile(db, 2024);
    const gen = result.righe[0];
    expect(gen.entrate).toBe(2000);
    expect(gen.uscite).toBe(500);
    expect(gen.saldo).toBe(1500);
    const feb = result.righe[1];
    expect(feb.saldo).toBe(-300);
  });

  it('calcola delta vs mese precedente', () => {
    seed();
    const result = getRiepilogoMensile(db, 2024);
    expect(result.righe[1].delta).toBe(-1800);
    expect(result.righe[2].delta).toBe(1000);
    expect(result.righe[3].delta).toBe(-700);
  });

  it('footer totale = somma dei 12 mesi', () => {
    seed();
    const result = getRiepilogoMensile(db, 2024);
    const totEntrate = result.righe.reduce((acc, r) => acc + r.entrate, 0);
    const totUscite = result.righe.reduce((acc, r) => acc + r.uscite, 0);
    const totSaldo = result.righe.reduce((acc, r) => acc + r.saldo, 0);
    expect(result.totale.entrate).toBeCloseTo(totEntrate, 5);
    expect(result.totale.uscite).toBeCloseTo(totUscite, 5);
    expect(result.totale.saldo).toBeCloseTo(totSaldo, 5);
  });

  it('footer media = totale / 12', () => {
    seed();
    const result = getRiepilogoMensile(db, 2024);
    expect(result.media.entrate).toBeCloseTo(result.totale.entrate / 12, 5);
    expect(result.media.uscite).toBeCloseTo(result.totale.uscite / 12, 5);
    expect(result.media.saldo).toBeCloseTo(result.totale.saldo / 12, 5);
  });

  it('footer mediana su 12 valori (media del 6° e 7°)', () => {
    seed();
    const result = getRiepilogoMensile(db, 2024);
    const sorted = [...result.righe].sort((a, b) => a.saldo - b.saldo).map((r) => r.saldo);
    const expectedMediana = (sorted[5] + sorted[6]) / 2;
    expect(result.mediana.saldo).toBeCloseTo(expectedMediana, 5);
  });

  it('imposta nome_mese corretto', () => {
    const result = getRiepilogoMensile(db, 2024);
    expect(result.righe[0].nome_mese).toBe('Gen');
    expect(result.righe[11].nome_mese).toBe('Dic');
  });

  it('mediana su serie dispari: sceglie elemento centrale', () => {
    createMovimento(db, { data: '2024-01-01', importo: 10, tipo: 'entrata' });
    createMovimento(db, { data: '2024-03-01', importo: 30, tipo: 'entrata' });
    createMovimento(db, { data: '2024-05-01', importo: 50, tipo: 'entrata' });
    const result = getRiepilogoMensile(db, 2024);
    const sortedSaldos = [...result.righe].map((r) => r.saldo).sort((a, b) => a - b);
    expect(sortedSaldos).toHaveLength(12);
    const expectedMediana = (sortedSaldos[5] + sortedSaldos[6]) / 2;
    expect(result.mediana.saldo).toBeCloseTo(expectedMediana, 5);
  });
});

describe('getPivotCategorie', () => {
  it('restituisce lista vuota per anno senza movimenti del tipo', () => {
    createMovimento(db, { data: '2024-01-10', importo: 100, tipo: 'entrata' });
    expect(getPivotCategorie(db, 2024, 'uscita')).toHaveLength(0);
  });

  it('pivot uscite: 2 categorie, mesi diversi', () => {
    const categorie = listCategorie(db);
    const ali = categorie.find((c) => c.nome === 'Alimentari')!;
    const utenze = categorie.find((c) => c.nome === 'Utenze')!;

    // Alimentari: gen 200, mar 300
    createMovimento(db, { data: '2024-01-10', importo: 200, tipo: 'uscita', categoria_id: ali.id });
    createMovimento(db, { data: '2024-03-15', importo: 300, tipo: 'uscita', categoria_id: ali.id });
    // Utenze: feb 150
    createMovimento(db, { data: '2024-02-20', importo: 150, tipo: 'uscita', categoria_id: utenze.id });

    const pivot = getPivotCategorie(db, 2024, 'uscita');
    expect(pivot).toHaveLength(2);

    const rowAli = pivot.find((r) => r.categoria === 'Alimentari')!;
    expect(rowAli.mesi).toHaveLength(12);
    expect(rowAli.mesi[0]).toBe(200);   // gen (indice 0)
    expect(rowAli.mesi[1]).toBe(0);     // feb
    expect(rowAli.mesi[2]).toBe(300);   // mar
    expect(rowAli.mesi[3]).toBe(0);     // apr

    const rowUt = pivot.find((r) => r.categoria === 'Utenze')!;
    expect(rowUt.mesi[0]).toBe(0);
    expect(rowUt.mesi[1]).toBe(150);
  });

  it('totale riga = somma mesi', () => {
    const categorie = listCategorie(db);
    const ali = categorie.find((c) => c.nome === 'Alimentari')!;
    createMovimento(db, { data: '2024-01-10', importo: 200, tipo: 'uscita', categoria_id: ali.id });
    createMovimento(db, { data: '2024-03-15', importo: 300, tipo: 'uscita', categoria_id: ali.id });

    const pivot = getPivotCategorie(db, 2024, 'uscita');
    const row = pivot.find((r) => r.categoria === 'Alimentari')!;
    const sommaMesi = row.mesi.reduce((acc, v) => acc + v, 0);
    expect(row.totale).toBeCloseTo(sommaMesi, 5);
  });

  it('media riga = totale / 12', () => {
    const categorie = listCategorie(db);
    const ali = categorie.find((c) => c.nome === 'Alimentari')!;
    createMovimento(db, { data: '2024-01-10', importo: 120, tipo: 'uscita', categoria_id: ali.id });

    const pivot = getPivotCategorie(db, 2024, 'uscita');
    const row = pivot.find((r) => r.categoria === 'Alimentari')!;
    expect(row.media).toBeCloseTo(row.totale / 12, 5);
  });

  it('mediana riga calcolata sui 12 mesi', () => {
    const categorie = listCategorie(db);
    const ali = categorie.find((c) => c.nome === 'Alimentari')!;
    createMovimento(db, { data: '2024-01-10', importo: 100, tipo: 'uscita', categoria_id: ali.id });
    createMovimento(db, { data: '2024-06-10', importo: 200, tipo: 'uscita', categoria_id: ali.id });

    const pivot = getPivotCategorie(db, 2024, 'uscita');
    const row = pivot.find((r) => r.categoria === 'Alimentari')!;
    const sorted = [...row.mesi].sort((a, b) => a - b);
    const expectedMediana = (sorted[5] + sorted[6]) / 2;
    expect(row.mediana).toBeCloseTo(expectedMediana, 5);
  });

  it('pivot entrate: isola tipo entrata', () => {
    const categorie = listCategorie(db);
    const ali = categorie.find((c) => c.nome === 'Alimentari')!;
    createMovimento(db, { data: '2024-01-10', importo: 500, tipo: 'entrata', categoria_id: ali.id });
    createMovimento(db, { data: '2024-01-15', importo: 200, tipo: 'uscita', categoria_id: ali.id });

    const pivotEntrate = getPivotCategorie(db, 2024, 'entrata');
    const pivotUscite = getPivotCategorie(db, 2024, 'uscita');

    const rowEntrata = pivotEntrate.find((r) => r.categoria === 'Alimentari')!;
    expect(rowEntrata.mesi[0]).toBe(500);

    const rowUscita = pivotUscite.find((r) => r.categoria === 'Alimentari')!;
    expect(rowUscita.mesi[0]).toBe(200);
  });

  it('anno diverso non interferisce', () => {
    const categorie = listCategorie(db);
    const ali = categorie.find((c) => c.nome === 'Alimentari')!;
    createMovimento(db, { data: '2023-05-10', importo: 999, tipo: 'uscita', categoria_id: ali.id });

    expect(getPivotCategorie(db, 2024, 'uscita')).toHaveLength(0);
  });
});
