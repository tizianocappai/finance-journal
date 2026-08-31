import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../../db/index';
import type Database from 'better-sqlite3';
import { createVoce, upsertValore, getStorico } from '../../ipc/patrimonio';

let db: Database.Database;

beforeEach(() => {
  db = initDatabase(':memory:');
});

afterEach(() => {
  db.close();
});

describe('getStorico', () => {
  it('restituisce array vuoto se nessun valore', () => {
    expect(getStorico(db)).toEqual([]);
  });

  it('restituisce una entry per ogni anno distinto presente', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2023, 12, 5000);
    upsertValore(db, v.id, 2024, 12, 8000);
    const storico = getStorico(db);
    expect(storico).toHaveLength(2);
    expect(storico.map((s) => s.anno)).toEqual([2023, 2024]);
  });

  it('usa esclusivamente mese = 12 per aggregare', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 1, 1000);
    upsertValore(db, v.id, 2024, 6, 2000);
    upsertValore(db, v.id, 2024, 12, 9000);
    const storico = getStorico(db);
    const entry2024 = storico.find((s) => s.anno === 2024);
    expect(entry2024?.totaleAttivi).toBe(9000);
  });

  it('voci senza valore a dicembre contribuiscono 0 a quell\'anno', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 6, 5000);
    const storico = getStorico(db);
    const entry2024 = storico.find((s) => s.anno === 2024);
    expect(entry2024).toBeDefined();
    expect(entry2024?.totaleAttivi).toBe(0);
  });

  it('separa correttamente attivi e passivi', () => {
    const vA = createVoce(db, 'Conto', 'attivo');
    const vP = createVoce(db, 'Mutuo', 'passivo');
    upsertValore(db, vA.id, 2024, 12, 10000);
    upsertValore(db, vP.id, 2024, 12, 4000);
    const storico = getStorico(db);
    const entry = storico.find((s) => s.anno === 2024)!;
    expect(entry.totaleAttivi).toBe(10000);
    expect(entry.totalePassivi).toBe(4000);
  });

  it('calcola patrimonioNetto come totaleAttivi - totalePassivi', () => {
    const vA = createVoce(db, 'Conto', 'attivo');
    const vP = createVoce(db, 'Mutuo', 'passivo');
    upsertValore(db, vA.id, 2024, 12, 10000);
    upsertValore(db, vP.id, 2024, 12, 4000);
    const storico = getStorico(db);
    const entry = storico.find((s) => s.anno === 2024)!;
    expect(entry.patrimonioNetto).toBe(6000);
  });

  it('dati multi-anno con mix dicembre e non', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2022, 12, 5000);
    upsertValore(db, v.id, 2023, 6, 6000);
    upsertValore(db, v.id, 2023, 12, 7000);
    upsertValore(db, v.id, 2024, 12, 9000);
    const storico = getStorico(db);
    expect(storico.find((s) => s.anno === 2022)?.totaleAttivi).toBe(5000);
    expect(storico.find((s) => s.anno === 2023)?.totaleAttivi).toBe(7000);
    expect(storico.find((s) => s.anno === 2024)?.totaleAttivi).toBe(9000);
  });

  it('anni ordinati in modo crescente', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2025, 12, 1000);
    upsertValore(db, v.id, 2022, 12, 1000);
    upsertValore(db, v.id, 2024, 12, 1000);
    const storico = getStorico(db);
    const anni = storico.map((s) => s.anno);
    expect(anni).toEqual([...anni].sort((a, b) => a - b));
  });
});
