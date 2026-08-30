import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../db/index';
import type Database from 'better-sqlite3';
import { getImpostazione, setImpostazione, getSaldoIniziale } from './impostazioni';

let db: Database.Database;

beforeEach(() => {
  db = initDatabase(':memory:');
});

afterEach(() => {
  db.close();
});

describe('getImpostazione', () => {
  it('restituisce null se la chiave non esiste', () => {
    expect(getImpostazione(db, 'valuta')).toBeNull();
  });

  it('restituisce il valore se la chiave esiste', () => {
    db.prepare(`INSERT INTO impostazioni (chiave, valore) VALUES ('valuta', 'EUR')`).run();
    expect(getImpostazione(db, 'valuta')).toBe('EUR');
  });
});

describe('setImpostazione', () => {
  it('inserisce una nuova chiave', () => {
    setImpostazione(db, 'valuta', 'EUR');
    expect(getImpostazione(db, 'valuta')).toBe('EUR');
  });

  it('sovrascrive un valore esistente', () => {
    setImpostazione(db, 'valuta', 'EUR');
    setImpostazione(db, 'valuta', 'USD');
    expect(getImpostazione(db, 'valuta')).toBe('USD');
  });

  it('gestisce valori con caratteri speciali', () => {
    const val = '{"importo":1000,"data":"2024-01-01"}';
    setImpostazione(db, 'saldo_iniziale', val);
    expect(getImpostazione(db, 'saldo_iniziale')).toBe(val);
  });

  it('può impostare più chiavi indipendenti', () => {
    setImpostazione(db, 'valuta', 'EUR');
    setImpostazione(db, 'saldo_iniziale_importo', '500');
    expect(getImpostazione(db, 'valuta')).toBe('EUR');
    expect(getImpostazione(db, 'saldo_iniziale_importo')).toBe('500');
  });
});

describe('getSaldoIniziale', () => {
  it('restituisce 0 senza impostazioni', () => {
    expect(getSaldoIniziale(db, 2024)).toBe(0);
  });

  it('include saldo se anno data <= anno', () => {
    setImpostazione(db, 'saldo_iniziale_importo', '1000');
    setImpostazione(db, 'saldo_iniziale_data', '2023-01-01');
    expect(getSaldoIniziale(db, 2024)).toBe(1000);
  });

  it('esclude saldo se anno data > anno', () => {
    setImpostazione(db, 'saldo_iniziale_importo', '1000');
    setImpostazione(db, 'saldo_iniziale_data', '2025-06-01');
    expect(getSaldoIniziale(db, 2024)).toBe(0);
  });

  it('include saldo se anno data == anno', () => {
    setImpostazione(db, 'saldo_iniziale_importo', '500');
    setImpostazione(db, 'saldo_iniziale_data', '2024-12-31');
    expect(getSaldoIniziale(db, 2024)).toBe(500);
  });

  it('restituisce 0 per importo non numerico', () => {
    setImpostazione(db, 'saldo_iniziale_importo', 'abc');
    setImpostazione(db, 'saldo_iniziale_data', '2023-01-01');
    expect(getSaldoIniziale(db, 2024)).toBe(0);
  });

  it('restituisce 0 per data malformata', () => {
    setImpostazione(db, 'saldo_iniziale_importo', '1000');
    setImpostazione(db, 'saldo_iniziale_data', 'bad');
    expect(getSaldoIniziale(db, 2024)).toBe(0);
  });
});
