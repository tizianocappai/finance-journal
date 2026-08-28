import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../db/index';
import type Database from 'better-sqlite3';
import {
  getDashboardKPI,
  getSerieMensili,
  getBreakdownCategorie,
  getTrendYoY,
} from './dashboard';
import { createMovimento } from './movimenti';
import { listCategorie } from './categorie';

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
