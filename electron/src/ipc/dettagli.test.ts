import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../db/index';
import type Database from 'better-sqlite3';
import {
  listDettagli,
  createDettaglio,
  deleteDettaglio,
  updateDettaglioCategoria,
  countMovimentiByDettaglio,
} from './dettagli';
import { listCategorie } from './categorie';

let db: Database.Database;

beforeEach(() => {
  db = initDatabase(':memory:');
});

afterEach(() => {
  db.close();
});

describe('listDettagli', () => {
  it('restituisce array vuoto se non ci sono dettagli', () => {
    const result = listDettagli(db);
    expect(result).toEqual([]);
  });

  it('restituisce i dettagli ordinati per nome dopo inserimento', () => {
    const cat = listCategorie(db)[0];
    createDettaglio(db, 'Supermercato', cat.id);
    createDettaglio(db, 'Bar');
    const result = listDettagli(db);
    const nomi = result.map((d) => d.nome);
    expect(nomi).toEqual([...nomi].sort());
  });
});

describe('createDettaglio', () => {
  it('crea un dettaglio con categoria e lo restituisce', () => {
    const cat = listCategorie(db).find((c) => c.nome === 'Alimentari')!;
    const det = createDettaglio(db, 'Supermercato', cat.id);
    expect(det.nome).toBe('Supermercato');
    expect(det.categoria_id).toBe(cat.id);
    expect(det.predefinito).toBe(0);
    expect(det.id).toBeTypeOf('number');
  });

  it('crea un dettaglio senza categoria', () => {
    const det = createDettaglio(db, 'Altro generico');
    expect(det.categoria_id).toBeNull();
  });

  it('lancia errore se il nome è duplicato', () => {
    createDettaglio(db, 'Supermercato');
    expect(() => createDettaglio(db, 'Supermercato')).toThrow();
  });
});

describe('deleteDettaglio', () => {
  it('elimina un dettaglio custom', () => {
    const det = createDettaglio(db, 'Supermercato');
    deleteDettaglio(db, det.id);
    expect(listDettagli(db).map((d) => d.nome)).not.toContain('Supermercato');
  });

  it('imposta dettaglio_id = NULL sui movimenti che lo referenziano', () => {
    const det = createDettaglio(db, 'Supermercato');
    db.prepare(
      `INSERT INTO movimenti (data, importo, tipo, dettaglio_id) VALUES ('2024-01-01', 30, 'uscita', ?)`,
    ).run(det.id);

    deleteDettaglio(db, det.id);

    const mov = db
      .prepare('SELECT dettaglio_id FROM movimenti WHERE 1=1')
      .get() as { dettaglio_id: number | null };
    expect(mov.dettaglio_id).toBeNull();
  });

  it('blocca l\'eliminazione di un dettaglio predefinito', () => {
    const det = db
      .prepare(
        `INSERT INTO dettagli (nome, predefinito) VALUES ('DetPredefinito', 1) RETURNING *`,
      )
      .get() as { id: number };
    expect(() => deleteDettaglio(db, det.id)).toThrow(/predefinito/i);
  });

  it('lancia errore se il dettaglio non esiste', () => {
    expect(() => deleteDettaglio(db, 9999)).toThrow();
  });
});

describe('countMovimentiByDettaglio', () => {
  it('restituisce 0 se nessun movimento usa il dettaglio', () => {
    const det = createDettaglio(db, 'Supermercato');
    expect(countMovimentiByDettaglio(db, det.id)).toBe(0);
  });

  it('restituisce il numero corretto di movimenti associati', () => {
    const det = createDettaglio(db, 'Supermercato');
    db.prepare(
      `INSERT INTO movimenti (data, importo, tipo, dettaglio_id) VALUES ('2024-01-01', 30, 'uscita', ?)`,
    ).run(det.id);
    db.prepare(
      `INSERT INTO movimenti (data, importo, tipo, dettaglio_id) VALUES ('2024-01-02', 20, 'uscita', ?)`,
    ).run(det.id);
    expect(countMovimentiByDettaglio(db, det.id)).toBe(2);
  });
});

describe('updateDettaglioCategoria', () => {
  it('aggiorna la categoria_id di un dettaglio', () => {
    const det = createDettaglio(db, 'Supermercato');
    const cat = listCategorie(db).find((c) => c.nome === 'Alimentari')!;

    const updated = updateDettaglioCategoria(db, det.id, cat.id);
    expect(updated.categoria_id).toBe(cat.id);
  });

  it('può impostare categoria_id a null', () => {
    const cat = listCategorie(db).find((c) => c.nome === 'Alimentari')!;
    const det = createDettaglio(db, 'Supermercato', cat.id);

    const updated = updateDettaglioCategoria(db, det.id, null);
    expect(updated.categoria_id).toBeNull();
  });

  it('lancia errore se il dettaglio non esiste', () => {
    expect(() => updateDettaglioCategoria(db, 9999, null)).toThrow();
  });
});
