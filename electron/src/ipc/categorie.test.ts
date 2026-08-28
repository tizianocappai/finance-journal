import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../db/index';
import type Database from 'better-sqlite3';
import {
  listCategorie,
  createCategoria,
  deleteCategoria,
} from './categorie';

let db: Database.Database;

beforeEach(() => {
  db = initDatabase(':memory:');
});

afterEach(() => {
  db.close();
});

describe('listCategorie', () => {
  it('restituisce tutte le categorie ordinate per nome', () => {
    const result = listCategorie(db);
    expect(result.length).toBeGreaterThan(0);
    const nomi = result.map((c) => c.nome);
    expect(nomi).toEqual([...nomi].sort());
  });

  it('include il flag predefinita=1 per le categorie di default', () => {
    const result = listCategorie(db);
    const altro = result.find((c) => c.nome === 'Altro');
    expect(altro?.predefinita).toBe(1);
  });
});

describe('createCategoria', () => {
  it('crea una categoria custom e la restituisce', () => {
    const cat = createCategoria(db, 'Hobby');
    expect(cat.nome).toBe('Hobby');
    expect(cat.predefinita).toBe(0);
    expect(cat.id).toBeTypeOf('number');
  });

  it('la categoria creata appare in listCategorie', () => {
    createCategoria(db, 'Hobby');
    const lista = listCategorie(db);
    expect(lista.map((c) => c.nome)).toContain('Hobby');
  });

  it('lancia errore se il nome è duplicato', () => {
    expect(() => createCategoria(db, 'Hobby')).not.toThrow();
    expect(() => createCategoria(db, 'Hobby')).toThrow();
  });
});

describe('deleteCategoria', () => {
  it('elimina una categoria custom', () => {
    const cat = createCategoria(db, 'Hobby');
    deleteCategoria(db, cat.id);
    const lista = listCategorie(db);
    expect(lista.map((c) => c.nome)).not.toContain('Hobby');
  });

  it('blocca l\'eliminazione di una categoria predefinita', () => {
    const predefinita = listCategorie(db).find((c) => c.predefinita === 1)!;
    expect(() => deleteCategoria(db, predefinita.id)).toThrow(/predefinita/i);
  });

  it('riassegna i movimenti alla categoria "Altro" prima di eliminare', () => {
    const cat = createCategoria(db, 'Hobby');
    db.prepare(
      `INSERT INTO movimenti (data, importo, tipo, categoria_id) VALUES ('2024-01-01', 100, 'uscita', ?)`,
    ).run(cat.id);

    deleteCategoria(db, cat.id);

    const altro = listCategorie(db).find((c) => c.nome === 'Altro')!;
    const mov = db
      .prepare('SELECT categoria_id FROM movimenti WHERE 1=1')
      .get() as { categoria_id: number };
    expect(mov.categoria_id).toBe(altro.id);
  });

  it('lancia errore se la categoria non esiste', () => {
    expect(() => deleteCategoria(db, 9999)).toThrow();
  });
});
