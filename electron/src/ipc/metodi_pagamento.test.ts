import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../db/index';
import type Database from 'better-sqlite3';
import {
  listMetodi,
  createMetodo,
  deleteMetodo,
} from './metodi_pagamento';

let db: Database.Database;

beforeEach(() => {
  db = initDatabase(':memory:');
});

afterEach(() => {
  db.close();
});

describe('listMetodi', () => {
  it('restituisce tutti i metodi di pagamento ordinati per nome', () => {
    const result = listMetodi(db);
    expect(result.length).toBeGreaterThan(0);
    const nomi = result.map((m) => m.nome);
    expect(nomi).toEqual([...nomi].sort());
  });

  it('include il flag predefinito=1 per i metodi di default', () => {
    const result = listMetodi(db);
    const contanti = result.find((m) => m.nome === 'Contanti');
    expect(contanti?.predefinito).toBe(1);
  });
});

describe('createMetodo', () => {
  it('crea un metodo custom e lo restituisce', () => {
    const metodo = createMetodo(db, 'Criptovaluta');
    expect(metodo.nome).toBe('Criptovaluta');
    expect(metodo.predefinito).toBe(0);
    expect(metodo.id).toBeTypeOf('number');
  });

  it('il metodo creato appare in listMetodi', () => {
    createMetodo(db, 'Criptovaluta');
    const lista = listMetodi(db);
    expect(lista.map((m) => m.nome)).toContain('Criptovaluta');
  });

  it('lancia errore se il nome è duplicato', () => {
    createMetodo(db, 'Criptovaluta');
    expect(() => createMetodo(db, 'Criptovaluta')).toThrow();
  });
});

describe('deleteMetodo', () => {
  it('elimina un metodo custom', () => {
    const metodo = createMetodo(db, 'Criptovaluta');
    deleteMetodo(db, metodo.id);
    const lista = listMetodi(db);
    expect(lista.map((m) => m.nome)).not.toContain('Criptovaluta');
  });

  it('blocca l\'eliminazione di un metodo predefinito', () => {
    const predefinito = listMetodi(db).find((m) => m.predefinito === 1)!;
    expect(() => deleteMetodo(db, predefinito.id)).toThrow(/predefinito/i);
  });

  it('imposta metodo_id = NULL sui movimenti che lo referenziano', () => {
    const metodo = createMetodo(db, 'Criptovaluta');
    db.prepare(
      `INSERT INTO movimenti (data, importo, tipo, metodo_id) VALUES ('2024-01-01', 50, 'uscita', ?)`,
    ).run(metodo.id);

    deleteMetodo(db, metodo.id);

    const mov = db
      .prepare('SELECT metodo_id FROM movimenti WHERE 1=1')
      .get() as { metodo_id: number | null };
    expect(mov.metodo_id).toBeNull();
  });

  it('lancia errore se il metodo non esiste', () => {
    expect(() => deleteMetodo(db, 9999)).toThrow();
  });
});
