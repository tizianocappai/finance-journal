import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../db/index';
import type Database from 'better-sqlite3';
import {
  listCategorie,
  createCategoria,
  deleteCategoria,
  updateCategoria,
  countMovimentiByCategoria,
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

describe('updateCategoria', () => {
  it('aggiorna nome e restituisce la categoria aggiornata', () => {
    const cat = createCategoria(db, 'Hobby');
    const updated = updateCategoria(db, cat.id, 'HobbyNew', '#ff0000', 'star');
    expect(updated.nome).toBe('HobbyNew');
    expect(updated.colore).toBe('#ff0000');
    expect(updated.icona).toBe('star');
  });

  it('lancia errore se id non esiste', () => {
    expect(() => updateCategoria(db, 9999, 'X')).toThrow(/non trovata/i);
  });

  it('lancia errore se nuovo nome già usato da altra categoria', () => {
    createCategoria(db, 'A');
    const b = createCategoria(db, 'B');
    expect(() => updateCategoria(db, b.id, 'A')).toThrow();
  });
});

describe('countMovimentiByCategoria', () => {
  it('restituisce 0 se nessun movimento associato', () => {
    const cat = createCategoria(db, 'Hobby');
    expect(countMovimentiByCategoria(db, cat.id)).toBe(0);
  });

  it('restituisce il numero corretto di movimenti', () => {
    const cat = createCategoria(db, 'Hobby');
    db.prepare(
      `INSERT INTO movimenti (data, importo, tipo, categoria_id) VALUES ('2024-01-01', 100, 'uscita', ?)`,
    ).run(cat.id);
    db.prepare(
      `INSERT INTO movimenti (data, importo, tipo, categoria_id) VALUES ('2024-01-02', 200, 'uscita', ?)`,
    ).run(cat.id);
    expect(countMovimentiByCategoria(db, cat.id)).toBe(2);
  });
});

describe('deleteCategoria', () => {
  it('elimina una categoria custom', () => {
    const altro = listCategorie(db).find((c) => c.nome === 'Altro')!;
    const cat = createCategoria(db, 'Hobby');
    deleteCategoria(db, cat.id, altro.id);
    const lista = listCategorie(db);
    expect(lista.map((c) => c.nome)).not.toContain('Hobby');
  });

  it('elimina una categoria predefinita senza errore', () => {
    const predefinita = listCategorie(db).find((c) => c.predefinita === 1)!;
    const altro = listCategorie(db).find((c) => c.predefinita === 1 && c.id !== predefinita.id) ??
      createCategoria(db, 'Target');
    expect(() => deleteCategoria(db, predefinita.id, altro.id)).not.toThrow();
  });

  it('riassegna i movimenti al targetCategoriaId prima di eliminare', () => {
    const altro = listCategorie(db).find((c) => c.nome === 'Altro')!;
    const cat = createCategoria(db, 'Hobby');
    db.prepare(
      `INSERT INTO movimenti (data, importo, tipo, categoria_id) VALUES ('2024-01-01', 100, 'uscita', ?)`,
    ).run(cat.id);

    deleteCategoria(db, cat.id, altro.id);

    const mov = db
      .prepare('SELECT categoria_id FROM movimenti WHERE 1=1')
      .get() as { categoria_id: number };
    expect(mov.categoria_id).toBe(altro.id);
  });

  it('lancia errore se la categoria non esiste', () => {
    const altro = listCategorie(db).find((c) => c.nome === 'Altro')!;
    expect(() => deleteCategoria(db, 9999, altro.id)).toThrow();
  });

  it('lancia errore se targetCategoriaId non esiste', () => {
    const cat = createCategoria(db, 'Hobby');
    expect(() => deleteCategoria(db, cat.id, 9999)).toThrow();
  });
});
