import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../db/index';
import Database from 'better-sqlite3';
import {
  listMovimenti,
  createMovimento,
  updateMovimento,
  deleteMovimento,
  restoreMovimento,
  deleteAllMovimenti,
} from './movimenti';
import type { Movimento } from './types';
import { listCategorie } from './categorie';
import { listMetodi } from './metodi_pagamento';
import { createDettaglio } from './dettagli';

let db: Database.Database;

beforeEach(() => {
  db = initDatabase(':memory:');
});

afterEach(() => {
  db.close();
});

function seed(db: Database.Database) {
  const cat = listCategorie(db).find((c) => c.nome === 'Alimentari')!;
  const metodo = listMetodi(db).find((m) => m.nome === 'Contanti')!;
  return { cat, metodo };
}

describe('createMovimento', () => {
  it('crea un movimento e lo restituisce', () => {
    const mov = createMovimento(db, {
      data: '2024-03-15',
      importo: 50,
      tipo: 'uscita',
    });
    expect(mov.id).toBeTypeOf('number');
    expect(mov.tipo).toBe('uscita');
    expect(mov.importo).toBe(50);
    expect(mov.data).toBe('2024-03-15');
  });

  it('accetta tutti i campi opzionali', () => {
    const { cat, metodo } = seed(db);
    const mov = createMovimento(db, {
      data: '2024-01-10',
      importo: 100,
      tipo: 'entrata',
      descrizione: 'Stipendio',
      categoria_id: cat.id,
      metodo_id: metodo.id,
    });
    expect(mov.descrizione).toBe('Stipendio');
    expect(mov.categoria_id).toBe(cat.id);
    expect(mov.metodo_id).toBe(metodo.id);
  });

  it('su DB migrato da Python (DEFAULT "" per created_at/updated_at) valorizza i timestamp', () => {
    const raw = new Database(':memory:');
    try {
      raw.exec(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE movimenti (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          data         TEXT    NOT NULL,
          importo      REAL    NOT NULL,
          tipo         TEXT    NOT NULL CHECK (tipo IN ('entrata', 'uscita')),
          descrizione  TEXT,
          categoria_id INTEGER,
          metodo_id    INTEGER,
          dettaglio_id INTEGER,
          created_at   TEXT    NOT NULL DEFAULT '',
          updated_at   TEXT    NOT NULL DEFAULT ''
        );
      `);
      const mov = createMovimento(raw, { data: '2024-03-15', importo: 50, tipo: 'uscita' });
      expect(mov.created_at).toBeTruthy();
      expect(mov.updated_at).toBeTruthy();
    } finally {
      raw.close();
    }
  });
});

describe('listMovimenti', () => {
  beforeEach(() => {
    const { cat, metodo } = seed(db);
    createMovimento(db, { data: '2024-01-10', importo: 100, tipo: 'entrata', descrizione: 'Stipendio', categoria_id: cat.id, metodo_id: metodo.id });
    createMovimento(db, { data: '2024-01-20', importo: 30,  tipo: 'uscita',  descrizione: 'Spesa supermercato' });
    createMovimento(db, { data: '2024-02-05', importo: 15,  tipo: 'uscita',  descrizione: 'Caffè' });
    createMovimento(db, { data: '2025-01-01', importo: 200, tipo: 'entrata', descrizione: 'Bonus anno nuovo' });
  });

  it('restituisce tutti i movimenti senza filtri', () => {
    expect(listMovimenti(db)).toHaveLength(4);
  });

  it('filtra per anno', () => {
    const result = listMovimenti(db, { anno: 2024 });
    expect(result).toHaveLength(3);
    result.forEach((m) => expect(m.data.startsWith('2024')).toBe(true));
  });

  it('filtra per mese e anno', () => {
    const result = listMovimenti(db, { anno: 2024, mese: 1 });
    expect(result).toHaveLength(2);
  });

  it('filtra per mese senza anno', () => {
    const result = listMovimenti(db, { mese: 1 });
    expect(result).toHaveLength(3);
    result.forEach((m) => expect(m.data).toMatch(/-01-/));
  });

  it('filtra per tipo entrata', () => {
    const result = listMovimenti(db, { tipo: 'entrata' });
    expect(result.every((m) => m.tipo === 'entrata')).toBe(true);
  });

  it('filtra per tipo uscita', () => {
    const result = listMovimenti(db, { tipo: 'uscita' });
    expect(result.every((m) => m.tipo === 'uscita')).toBe(true);
  });

  it('filtra per categoria_id', () => {
    const { cat } = seed(db);
    const result = listMovimenti(db, { categoria_id: cat.id });
    expect(result).toHaveLength(1);
    expect(result[0].categoria_id).toBe(cat.id);
  });

  it('filtra per metodo_id', () => {
    const { metodo } = seed(db);
    const result = listMovimenti(db, { metodo_id: metodo.id });
    expect(result).toHaveLength(1);
    expect(result[0].metodo_id).toBe(metodo.id);
  });

  it('filtra per testo nella descrizione', () => {
    const result = listMovimenti(db, { testo: 'Stipendio' });
    expect(result).toHaveLength(1);
    expect(result[0].descrizione).toBe('Stipendio');
  });

  it('ricerca testo parziale', () => {
    const result = listMovimenti(db, { testo: 'Bonus' });
    expect(result).toHaveLength(1);
  });

  it('restituisce categoria_nome e metodo_nome dal JOIN', () => {
    const { cat, metodo } = seed(db);
    const result = listMovimenti(db, { testo: 'Stipendio' });
    expect(result[0].categoria_nome).toBe(cat.nome);
    expect(result[0].metodo_nome).toBe(metodo.nome);
  });

  it('restituisce dettaglio_nome dal JOIN sui dettagli', () => {
    const { cat } = seed(db);
    const dettaglio = createDettaglio(db, 'Supermercato', cat.id);
    createMovimento(db, {
      data: '2024-01-10',
      importo: 100,
      tipo: 'uscita',
      descrizione: 'DettSpesaUnica',
      categoria_id: cat.id,
      dettaglio_id: dettaglio.id,
    });
    const result = listMovimenti(db, { testo: 'DettSpesaUnica' });
    expect(result).toHaveLength(1);
    expect(result[0].dettaglio_nome).toBe('Supermercato');
  });

  it('restituisce dettaglio_nome null per movimenti senza dettaglio', () => {
    createMovimento(db, { data: '2024-01-10', importo: 50, tipo: 'uscita' });
    const result = listMovimenti(db);
    expect(result[0].dettaglio_nome).toBeNull();
  });

  it('ordina per data DESC', () => {
    const result = listMovimenti(db, { anno: 2024 });
    const dates = result.map((m) => m.data);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('restituisce lista vuota se nessun match', () => {
    expect(listMovimenti(db, { testo: 'xyz_nessun_match' })).toHaveLength(0);
  });
});

describe('updateMovimento', () => {
  it('aggiorna i campi del movimento', () => {
    const mov = createMovimento(db, { data: '2024-01-10', importo: 50, tipo: 'uscita' });
    const updated = updateMovimento(db, mov.id, {
      data: '2024-02-20',
      importo: 75,
      tipo: 'entrata',
      descrizione: 'Aggiornato',
    });
    expect(updated.data).toBe('2024-02-20');
    expect(updated.importo).toBe(75);
    expect(updated.tipo).toBe('entrata');
    expect(updated.descrizione).toBe('Aggiornato');
  });

  it('lancia errore se il movimento non esiste', () => {
    expect(() =>
      updateMovimento(db, 9999, { data: '2024-01-01', importo: 1, tipo: 'uscita' }),
    ).toThrow(/non trovato/i);
  });

  it('permette di azzerare i campi nullable', () => {
    const { cat } = seed(db);
    const mov = createMovimento(db, {
      data: '2024-01-10',
      importo: 50,
      tipo: 'uscita',
      categoria_id: cat.id,
      descrizione: 'Descrizione',
    });
    const updated = updateMovimento(db, mov.id, {
      data: mov.data,
      importo: mov.importo,
      tipo: mov.tipo,
      categoria_id: null,
      descrizione: null,
    });
    expect(updated.categoria_id).toBeNull();
    expect(updated.descrizione).toBeNull();
  });
});

describe('deleteMovimento', () => {
  it('elimina il movimento', () => {
    const mov = createMovimento(db, { data: '2024-01-10', importo: 50, tipo: 'uscita' });
    deleteMovimento(db, mov.id);
    expect(listMovimenti(db)).toHaveLength(0);
  });

  it('lancia errore se il movimento non esiste', () => {
    expect(() => deleteMovimento(db, 9999)).toThrow();
  });
});

describe('restoreMovimento', () => {
  it('crea + elimina + restore → movimento riappare con stessi dati', () => {
    const { cat, metodo } = seed(db);
    const mov = createMovimento(db, {
      data: '2024-03-15',
      importo: 50,
      tipo: 'uscita',
      descrizione: 'Test restore',
      categoria_id: cat.id,
      metodo_id: metodo.id,
    });
    deleteMovimento(db, mov.id);
    expect(listMovimenti(db)).toHaveLength(0);

    restoreMovimento(db, mov);
    const restored = listMovimenti(db);
    expect(restored).toHaveLength(1);
    expect(restored[0].id).toBe(mov.id);
    expect(restored[0].data).toBe(mov.data);
    expect(restored[0].importo).toBe(mov.importo);
    expect(restored[0].tipo).toBe(mov.tipo);
    expect(restored[0].descrizione).toBe(mov.descrizione);
    expect(restored[0].categoria_id).toBe(mov.categoria_id);
    expect(restored[0].metodo_id).toBe(mov.metodo_id);
  });

  it('restore su id inesistente non genera errori e inserisce il record', () => {
    const fake: Movimento = {
      id: 9999,
      data: '2024-01-01',
      importo: 100,
      tipo: 'uscita',
      descrizione: null,
      categoria_id: null,
      metodo_id: null,
      dettaglio_id: null,
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    };
    expect(() => restoreMovimento(db, fake)).not.toThrow();
    const all = listMovimenti(db);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(9999);
  });
});

describe('deleteAllMovimenti', () => {
  beforeEach(() => {
    const { cat, metodo } = seed(db);
    createMovimento(db, { data: '2024-01-10', importo: 100, tipo: 'entrata', descrizione: 'Stipendio', categoria_id: cat.id, metodo_id: metodo.id });
    createMovimento(db, { data: '2024-01-20', importo: 30,  tipo: 'uscita',  descrizione: 'Spesa supermercato' });
    createMovimento(db, { data: '2024-02-05', importo: 15,  tipo: 'uscita',  descrizione: 'Caffè' });
    createMovimento(db, { data: '2025-01-01', importo: 200, tipo: 'entrata', descrizione: 'Bonus anno nuovo' });
  });

  it('senza filtri elimina tutti e restituisce tutti i movimenti', () => {
    const deleted = deleteAllMovimenti(db);
    expect(deleted).toHaveLength(4);
    expect(listMovimenti(db)).toHaveLength(0);
  });

  it('filtra per anno → elimina solo quell\'anno', () => {
    const deleted = deleteAllMovimenti(db, { anno: 2024 });
    expect(deleted).toHaveLength(3);
    deleted.forEach((m) => expect(m.data.startsWith('2024')).toBe(true));
    const remaining = listMovimenti(db);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].data.startsWith('2025')).toBe(true);
  });

  it('filtra per tipo uscita → elimina solo uscite', () => {
    const deleted = deleteAllMovimenti(db, { tipo: 'uscita' });
    expect(deleted).toHaveLength(2);
    deleted.forEach((m) => expect(m.tipo).toBe('uscita'));
    const remaining = listMovimenti(db);
    expect(remaining).toHaveLength(2);
    remaining.forEach((m) => expect(m.tipo).toBe('entrata'));
  });

  it('filtra per testo → elimina solo matching', () => {
    const deleted = deleteAllMovimenti(db, { testo: 'Stipendio' });
    expect(deleted).toHaveLength(1);
    expect(deleted[0].descrizione).toBe('Stipendio');
    expect(listMovimenti(db)).toHaveLength(3);
  });

  it('filtra per categoria_id → elimina solo matching', () => {
    const { cat } = seed(db);
    const deleted = deleteAllMovimenti(db, { categoria_id: cat.id });
    expect(deleted).toHaveLength(1);
    expect(deleted[0].categoria_id).toBe(cat.id);
    expect(listMovimenti(db)).toHaveLength(3);
  });

  it('filtra per metodo_id → elimina solo matching', () => {
    const { metodo } = seed(db);
    const deleted = deleteAllMovimenti(db, { metodo_id: metodo.id });
    expect(deleted).toHaveLength(1);
    expect(deleted[0].metodo_id).toBe(metodo.id);
    expect(listMovimenti(db)).toHaveLength(3);
  });

  it('restituisce array vuoto se nessun match', () => {
    const deleted = deleteAllMovimenti(db, { testo: 'xyz_nessun_match' });
    expect(deleted).toHaveLength(0);
    expect(listMovimenti(db)).toHaveLength(4);
  });

  it('i movimenti eliminati contengono tutti i campi necessari per restore', () => {
    const { cat, metodo } = seed(db);
    const deleted = deleteAllMovimenti(db, { testo: 'Stipendio' });
    expect(deleted[0].id).toBeTypeOf('number');
    expect(deleted[0].data).toBe('2024-01-10');
    expect(deleted[0].importo).toBe(100);
    expect(deleted[0].tipo).toBe('entrata');
    expect(deleted[0].categoria_id).toBe(cat.id);
    expect(deleted[0].metodo_id).toBe(metodo.id);
    expect(deleted[0].created_at).toBeTruthy();
    expect(deleted[0].updated_at).toBeTruthy();
  });
});
