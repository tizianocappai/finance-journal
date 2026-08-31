import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../db/index';
import type Database from 'better-sqlite3';
import {
  listDettagli,
  createDettaglio,
  deleteDettaglio,
  updateDettaglio,
  updateDettaglioCategoria,
  countMovimentiByDettaglio,
  getDettagliOrdinatiPerFrequenza,
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
    const target = createDettaglio(db, 'Altro');
    deleteDettaglio(db, det.id, target.id);
    expect(listDettagli(db).map((d) => d.nome)).not.toContain('Supermercato');
  });

  it('riassegna dettaglio_id al targetDettaglioId sui movimenti che lo referenziano', () => {
    const det = createDettaglio(db, 'Supermercato');
    const target = createDettaglio(db, 'Altro');
    db.prepare(
      `INSERT INTO movimenti (data, importo, tipo, dettaglio_id) VALUES ('2024-01-01', 30, 'uscita', ?)`,
    ).run(det.id);

    deleteDettaglio(db, det.id, target.id);

    const mov = db
      .prepare('SELECT dettaglio_id FROM movimenti WHERE 1=1')
      .get() as { dettaglio_id: number | null };
    expect(mov.dettaglio_id).toBe(target.id);
  });

  it('elimina un dettaglio predefinito senza blocchi', () => {
    const det = db
      .prepare(
        `INSERT INTO dettagli (nome, predefinito) VALUES ('DetPredefinito', 1) RETURNING *`,
      )
      .get() as { id: number };
    const target = createDettaglio(db, 'Altro');
    expect(() => deleteDettaglio(db, det.id, target.id)).not.toThrow();
  });

  it('lancia errore se il dettaglio non esiste', () => {
    const target = createDettaglio(db, 'Altro');
    expect(() => deleteDettaglio(db, 9999, target.id)).toThrow();
  });

  it('lancia errore se il targetDettaglioId non esiste', () => {
    const det = createDettaglio(db, 'Supermercato');
    expect(() => deleteDettaglio(db, det.id, 9999)).toThrow();
  });
});

describe('updateDettaglio', () => {
  it('aggiorna nome e categoria_id', () => {
    const cat = listCategorie(db).find((c) => c.nome === 'Alimentari')!;
    const det = createDettaglio(db, 'Supermercato');
    const updated = updateDettaglio(db, det.id, 'Ipermercato', cat.id);
    expect(updated.nome).toBe('Ipermercato');
    expect(updated.categoria_id).toBe(cat.id);
  });

  it('aggiorna solo il nome preservando la categoria_id esistente', () => {
    const cat = listCategorie(db).find((c) => c.nome === 'Alimentari')!;
    const det = createDettaglio(db, 'Supermercato', cat.id);
    const updated = updateDettaglio(db, det.id, 'Ipermercato');
    expect(updated.nome).toBe('Ipermercato');
    expect(updated.categoria_id).toBe(cat.id);
  });

  it('lancia errore se l\'id non esiste', () => {
    expect(() => updateDettaglio(db, 9999, 'Nome')).toThrow();
  });

  it('lancia errore se il nome è già usato da un altro dettaglio', () => {
    createDettaglio(db, 'Supermercato');
    const det2 = createDettaglio(db, 'Bar');
    expect(() => updateDettaglio(db, det2.id, 'Supermercato')).toThrow();
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

describe('getDettagliOrdinatiPerFrequenza', () => {
  it('restituisce array vuoto se non ci sono dettagli', () => {
    expect(getDettagliOrdinatiPerFrequenza(db)).toEqual([]);
  });

  it('include uso_count = 0 per dettagli senza movimenti', () => {
    createDettaglio(db, 'Supermercato');
    const result = getDettagliOrdinatiPerFrequenza(db);
    expect(result).toHaveLength(1);
    expect(result[0].uso_count).toBe(0);
  });

  it('ordina per frequenza discendente', () => {
    const det1 = createDettaglio(db, 'Supermercato');
    const det2 = createDettaglio(db, 'Bar');
    const det3 = createDettaglio(db, 'Farmacia');
    db.prepare(`INSERT INTO movimenti (data, importo, tipo, dettaglio_id) VALUES ('2024-01-01', 10, 'uscita', ?)`).run(det1.id);
    db.prepare(`INSERT INTO movimenti (data, importo, tipo, dettaglio_id) VALUES ('2024-01-02', 10, 'uscita', ?)`).run(det1.id);
    db.prepare(`INSERT INTO movimenti (data, importo, tipo, dettaglio_id) VALUES ('2024-01-03', 10, 'uscita', ?)`).run(det1.id);
    db.prepare(`INSERT INTO movimenti (data, importo, tipo, dettaglio_id) VALUES ('2024-01-04', 10, 'uscita', ?)`).run(det2.id);
    const result = getDettagliOrdinatiPerFrequenza(db);
    expect(result[0].id).toBe(det1.id);
    expect(result[0].uso_count).toBe(3);
    expect(result[1].id).toBe(det2.id);
    expect(result[1].uso_count).toBe(1);
    expect(result[2].id).toBe(det3.id);
    expect(result[2].uso_count).toBe(0);
  });

  it('a parità di frequenza ordina per nome', () => {
    createDettaglio(db, 'Zucchero');
    createDettaglio(db, 'Acqua');
    const result = getDettagliOrdinatiPerFrequenza(db);
    expect(result[0].nome).toBe('Acqua');
    expect(result[1].nome).toBe('Zucchero');
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
