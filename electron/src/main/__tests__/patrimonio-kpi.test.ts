import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../../db/index';
import type Database from 'better-sqlite3';
import { createVoce, upsertValore, getKpiPatrimonio } from '../../ipc/patrimonio';

let db: Database.Database;

beforeEach(() => {
  db = initDatabase(':memory:');
});

afterEach(() => {
  db.close();
});

describe('getKpiPatrimonio — totali invariati', () => {
  it('restituisce zeri e delta null se nessun valore', () => {
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.totaleAttivi).toBe(0);
    expect(kpi.totalePassivi).toBe(0);
    expect(kpi.patrimonioNetto).toBe(0);
    expect(kpi.deltaAttiviYoY).toBeNull();
    expect(kpi.deltaPassiviYoY).toBeNull();
    expect(kpi.deltaNettoYoY).toBeNull();
  });

  it('somma correttamente attivi e passivi con più voci', () => {
    const v1 = createVoce(db, 'Conto', 'attivo');
    const v2 = createVoce(db, 'Mutuo', 'passivo');
    upsertValore(db, v1.id, 2024, 6, 10000);
    upsertValore(db, v2.id, 2024, 6, 3000);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.totaleAttivi).toBe(10000);
    expect(kpi.totalePassivi).toBe(3000);
    expect(kpi.patrimonioNetto).toBe(7000);
  });
});

describe('getKpiPatrimonio — delta YoY', () => {
  it('delta null quando anno-1 non ha dati', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 12, 10000);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.deltaAttiviYoY).toBeNull();
    expect(kpi.deltaNettoYoY).toBeNull();
  });

  it('calcola delta corretto quando esistono dati anno-1', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2023, 12, 8000);
    upsertValore(db, v.id, 2024, 12, 10000);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.deltaAttiviYoY).not.toBeNull();
    expect(kpi.deltaAttiviYoY?.assoluto).toBe(2000);
    expect(kpi.deltaAttiviYoY?.percentuale).toBeCloseTo(25, 1);
  });

  it('delta negativo quando valore scende', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2023, 12, 10000);
    upsertValore(db, v.id, 2024, 12, 8000);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.deltaAttiviYoY?.assoluto).toBe(-2000);
    expect(kpi.deltaAttiviYoY?.percentuale).toBeCloseTo(-20, 1);
  });

  it('usa ultimo mese disponibile (non necessariamente dicembre) per entrambi gli anni', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2023, 9, 8000);
    upsertValore(db, v.id, 2024, 6, 10000);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.totaleAttivi).toBe(10000);
    expect(kpi.deltaAttiviYoY?.assoluto).toBe(2000);
  });

  it('patrimonioNetto delta usa attivi - passivi per entrambi gli anni', () => {
    const vA = createVoce(db, 'Conto', 'attivo');
    const vP = createVoce(db, 'Mutuo', 'passivo');
    upsertValore(db, vA.id, 2023, 12, 8000);
    upsertValore(db, vP.id, 2023, 12, 3000);
    upsertValore(db, vA.id, 2024, 12, 10000);
    upsertValore(db, vP.id, 2024, 12, 4000);
    const kpi = getKpiPatrimonio(db, 2024);
    // 2023: netto = 5000; 2024: netto = 6000; delta = +1000 (+20%)
    expect(kpi.deltaNettoYoY?.assoluto).toBe(1000);
    expect(kpi.deltaNettoYoY?.percentuale).toBeCloseTo(20, 1);
  });

  it('delta null su passivi quando anno precedente ha passivi = 0 (dati anno-1 presenti ma solo attivi)', () => {
    const vA = createVoce(db, 'Conto', 'attivo');
    const vP = createVoce(db, 'Mutuo', 'passivo');
    // anno-1 (2023) ha dati per gli attivi ma passivi = 0 → computeYoY(3000, 0) = null
    upsertValore(db, vA.id, 2023, 12, 5000);
    upsertValore(db, vP.id, 2024, 12, 3000);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.deltaPassiviYoY).toBeNull();
  });
});

describe('getKpiPatrimonio — ytdNetto', () => {
  it('ytdNetto null se nessun dato', () => {
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.ytdNetto).toBeNull();
  });

  it('ytdNetto null se primo periodo netto = 0', () => {
    const vA = createVoce(db, 'Conto', 'attivo');
    const vP = createVoce(db, 'Mutuo', 'passivo');
    upsertValore(db, vA.id, 2024, 1, 5000);
    upsertValore(db, vP.id, 2024, 1, 5000);
    upsertValore(db, vA.id, 2024, 6, 8000);
    upsertValore(db, vP.id, 2024, 6, 4000);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.ytdNetto).toBeNull();
  });

  it('calcola ytdNetto da primo a ultimo periodo disponibile', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 1, 10000);
    upsertValore(db, v.id, 2024, 6, 12000);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.ytdNetto?.assoluto).toBe(2000);
    expect(kpi.ytdNetto?.percentuale).toBeCloseTo(20, 1);
  });

  it('ytdNetto negativo quando il patrimonio scende', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 1, 10000);
    upsertValore(db, v.id, 2024, 6, 8000);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.ytdNetto?.assoluto).toBe(-2000);
    expect(kpi.ytdNetto?.percentuale).toBeCloseTo(-20, 1);
  });

  it('ytdNetto zero quando unico periodo disponibile', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 6, 10000);
    const kpi = getKpiPatrimonio(db, 2024);
    // primo = ultimo → delta = 0, ma computeYoY(10000, 10000) = { assoluto: 0, percentuale: 0 }
    expect(kpi.ytdNetto?.assoluto).toBe(0);
    expect(kpi.ytdNetto?.percentuale).toBe(0);
  });
});
