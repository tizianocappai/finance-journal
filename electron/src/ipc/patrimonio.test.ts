import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initDatabase } from '../db/index';
import type Database from 'better-sqlite3';
import {
  listGruppi,
  createGruppo,
  updateGruppo,
  deleteGruppo,
  listVoci,
  createVoce,
  updateVoce,
  archiveVoce,
  restoreVoce,
  upsertValore,
  deleteValore,
  listValoriPerAnno,
  getKpiPatrimonio,
  countValoriNascosti,
  getGranularita,
  setGranularita,
  findOrCreateGruppo,
} from './patrimonio';

let db: Database.Database;

beforeEach(() => {
  db = initDatabase(':memory:');
});

afterEach(() => {
  db.close();
});

describe('listGruppi', () => {
  it('restituisce lista vuota se nessun gruppo', () => {
    expect(listGruppi(db)).toEqual([]);
  });

  it('restituisce i gruppi creati', () => {
    createGruppo(db, 'Liquidità', 'attivo');
    createGruppo(db, 'Mutui', 'passivo');
    const list = listGruppi(db);
    expect(list).toHaveLength(2);
  });
});

describe('createGruppo', () => {
  it('crea un gruppo e lo restituisce', () => {
    const g = createGruppo(db, 'Liquidità', 'attivo');
    expect(g.nome).toBe('Liquidità');
    expect(g.tipo).toBe('attivo');
    expect(g.id).toBeTypeOf('number');
  });

  it('lancia errore se nome+tipo duplicato', () => {
    createGruppo(db, 'Liquidità', 'attivo');
    expect(() => createGruppo(db, 'Liquidità', 'attivo')).toThrow();
  });

  it('stesso nome con tipo diverso è permesso', () => {
    createGruppo(db, 'Investimenti', 'attivo');
    expect(() => createGruppo(db, 'Investimenti', 'passivo')).not.toThrow();
  });
});

describe('updateGruppo', () => {
  it('rinomina il gruppo', () => {
    const g = createGruppo(db, 'Vecchio', 'attivo');
    const updated = updateGruppo(db, g.id, 'Nuovo');
    expect(updated.nome).toBe('Nuovo');
    expect(updated.tipo).toBe('attivo');
  });

  it('lancia errore se id non esiste', () => {
    expect(() => updateGruppo(db, 9999, 'X')).toThrow(/non trovato/i);
  });
});

describe('deleteGruppo', () => {
  it('elimina il gruppo', () => {
    const g = createGruppo(db, 'Liquidità', 'attivo');
    deleteGruppo(db, g.id);
    expect(listGruppi(db)).toHaveLength(0);
  });

  it('lancia errore se id non esiste', () => {
    expect(() => deleteGruppo(db, 9999)).toThrow(/non trovato/i);
  });

  it('ON DELETE SET NULL: delete gruppo → voci diventano ungrouped (gruppo_id = NULL)', () => {
    const g = createGruppo(db, 'Liquidità', 'attivo');
    const v = createVoce(db, 'Conto corrente', 'attivo', g.id);
    deleteGruppo(db, g.id);
    const voci = listVoci(db);
    const voceAggiornata = voci.find((x) => x.id === v.id);
    expect(voceAggiornata?.gruppo_id).toBeNull();
  });
});

describe('listVoci', () => {
  it('restituisce solo voci attive per default (senza anno)', () => {
    const v1 = createVoce(db, 'Conto', 'attivo');
    const v2 = createVoce(db, 'Fondo', 'attivo');
    archiveVoce(db, v2.id, 2024);
    const list = listVoci(db);
    expect(list.map((v) => v.id)).toContain(v1.id);
    expect(list.map((v) => v.id)).not.toContain(v2.id);
  });

  it('con soloAttive=false restituisce tutte le voci', () => {
    const v1 = createVoce(db, 'Conto', 'attivo');
    const v2 = createVoce(db, 'Fondo', 'attivo');
    archiveVoce(db, v2.id, 2024);
    const list = listVoci(db, false);
    expect(list.map((v) => v.id)).toContain(v1.id);
    expect(list.map((v) => v.id)).toContain(v2.id);
  });
});

describe('createVoce', () => {
  it('crea una voce con attiva=1 di default', () => {
    const v = createVoce(db, 'Conto corrente', 'attivo');
    expect(v.nome).toBe('Conto corrente');
    expect(v.tipo).toBe('attivo');
    expect(v.attiva).toBe(1);
    expect(v.gruppo_id).toBeNull();
  });

  it('crea una voce con gruppo_id', () => {
    const g = createGruppo(db, 'Liquidità', 'attivo');
    const v = createVoce(db, 'Conto corrente', 'attivo', g.id);
    expect(v.gruppo_id).toBe(g.id);
  });
});

describe('updateVoce', () => {
  it('aggiorna nome e gruppo_id', () => {
    const g = createGruppo(db, 'Liquidità', 'attivo');
    const v = createVoce(db, 'Conto', 'attivo');
    const updated = updateVoce(db, v.id, { nome: 'Conto corrente', gruppo_id: g.id });
    expect(updated.nome).toBe('Conto corrente');
    expect(updated.gruppo_id).toBe(g.id);
  });

  it('lancia errore se id non esiste', () => {
    expect(() => updateVoce(db, 9999, { nome: 'X' })).toThrow(/non trovata/i);
  });
});

describe('archiveVoce / restoreVoce', () => {
  it('archiveVoce imposta attiva=0 per l\'anno indicato e successivi', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    archiveVoce(db, v.id, 2027);
    // In 2027 risulta archiviata
    const all2027 = listVoci(db, false, 2027);
    expect(all2027.find((x) => x.id === v.id)?.attiva).toBe(0);
  });

  it('voce archiviata nel 2027 rimane attiva nel 2026', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2026, 1, 1000);
    archiveVoce(db, v.id, 2027);

    // In 2026 la voce è ancora attiva
    const attive2026 = listVoci(db, true, 2026);
    expect(attive2026.find((x) => x.id === v.id)?.attiva).toBe(1);

    // In 2027 non appare tra le attive
    const attive2027 = listVoci(db, true, 2027);
    expect(attive2027.find((x) => x.id === v.id)).toBeUndefined();

    // Con soloAttive=false in 2027 compare come archiviata
    const tutte2027 = listVoci(db, false, 2027);
    expect(tutte2027.find((x) => x.id === v.id)?.attiva).toBe(0);
  });

  it('anno_archiviato = 2026: archiviata in 2025 e 2026', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    archiveVoce(db, v.id, 2026);
    // 2025 è PRIMA dell'anno di archiviazione → attiva
    const attive2025 = listVoci(db, true, 2025);
    expect(attive2025.find((x) => x.id === v.id)?.attiva).toBe(1);
    // 2026 è l'anno di archiviazione → non attiva
    const attive2026 = listVoci(db, true, 2026);
    expect(attive2026.find((x) => x.id === v.id)).toBeUndefined();
  });

  it('restoreVoce rimuove anno_archiviato: voce torna attiva in tutti gli anni', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    archiveVoce(db, v.id, 2027);
    restoreVoce(db, v.id);
    // Dopo il ripristino torna attiva in qualsiasi anno
    const attive2027 = listVoci(db, true, 2027);
    expect(attive2027.find((x) => x.id === v.id)?.attiva).toBe(1);
  });

  it('archiveVoce lancia errore se id non esiste', () => {
    expect(() => archiveVoce(db, 9999, 2027)).toThrow(/non trovata/i);
  });

  it('restoreVoce lancia errore se id non esiste', () => {
    expect(() => restoreVoce(db, 9999)).toThrow(/non trovata/i);
  });
});

describe('upsertValore', () => {
  it('inserisce un valore e lo restituisce', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    const val = upsertValore(db, v.id, 2024, 1, 1000);
    expect(val.voce_id).toBe(v.id);
    expect(val.anno).toBe(2024);
    expect(val.mese).toBe(1);
    expect(val.importo).toBe(1000);
  });

  it('upsert sovrascrive il valore esistente per stessa (voce_id, anno, mese)', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 1, 1000);
    upsertValore(db, v.id, 2024, 1, 2000);
    const valori = listValoriPerAnno(db, 2024);
    expect(valori).toHaveLength(1);
    expect(valori[0].importo).toBe(2000);
  });

  it('inserisce valori per mesi diversi della stessa voce', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 1, 1000);
    upsertValore(db, v.id, 2024, 2, 1500);
    expect(listValoriPerAnno(db, 2024)).toHaveLength(2);
  });

  it('UNIQUE constraint (voce_id, anno, mese): raw INSERT duplicato lancia errore', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    db.prepare('INSERT INTO patrimonio_valori (voce_id, anno, mese, importo) VALUES (?, ?, ?, ?)').run(v.id, 2024, 1, 1000);
    expect(() =>
      db.prepare('INSERT INTO patrimonio_valori (voce_id, anno, mese, importo) VALUES (?, ?, ?, ?)').run(v.id, 2024, 1, 2000)
    ).toThrow();
  });
});

describe('deleteValore', () => {
  it('elimina il valore specificato', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 1, 1000);
    deleteValore(db, v.id, 2024, 1);
    expect(listValoriPerAnno(db, 2024)).toHaveLength(0);
  });

  it('non lancia errore se il valore non esiste', () => {
    expect(() => deleteValore(db, 9999, 2024, 1)).not.toThrow();
  });
});

describe('listValoriPerAnno', () => {
  it('restituisce solo i valori dell\'anno richiesto', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 1, 1000);
    upsertValore(db, v.id, 2025, 1, 2000);
    expect(listValoriPerAnno(db, 2024)).toHaveLength(1);
    expect(listValoriPerAnno(db, 2025)).toHaveLength(1);
  });
});

describe('getKpiPatrimonio', () => {
  it('restituisce zeri se nessun valore', () => {
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.totaleAttivi).toBe(0);
    expect(kpi.totalePassivi).toBe(0);
    expect(kpi.patrimonioNetto).toBe(0);
  });

  it('prende il valore più recente per voce, non la somma di tutti i mesi', () => {
    const vAttivo = createVoce(db, 'Conto', 'attivo');
    const vPassivo = createVoce(db, 'Mutuo', 'passivo');
    // Conto: Gen=10000 e Feb=11000 → più recente = Feb = 11000
    upsertValore(db, vAttivo.id, 2024, 1, 10000);
    upsertValore(db, vAttivo.id, 2024, 2, 11000);
    // Mutuo: solo Gen=5000
    upsertValore(db, vPassivo.id, 2024, 1, 5000);

    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.totaleAttivi).toBe(11000);   // non 21000 (10000+11000)
    expect(kpi.totalePassivi).toBe(5000);
    expect(kpi.patrimonioNetto).toBe(6000); // non 16000
  });

  it('somma più voci attive con valori in mesi diversi', () => {
    const v1 = createVoce(db, 'Conto', 'attivo');
    const v2 = createVoce(db, 'BTP', 'attivo');
    // v1: ultimo valore = Mar = 1000
    upsertValore(db, v1.id, 2024, 1, 500);
    upsertValore(db, v1.id, 2024, 3, 1000);
    // v2: ultimo valore = Gen = 2000
    upsertValore(db, v2.id, 2024, 1, 2000);

    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.totaleAttivi).toBe(3000); // 1000 + 2000, non 500+1000+2000=3500
  });

  it('celle NULL (non inserite) non vengono conteggiate', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    // Solo mese 1 ha valore, mese 2 non ha riga → non viene sommato
    upsertValore(db, v.id, 2024, 1, 1000);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.totaleAttivi).toBe(1000);
  });

  it('celle con importo 0 esplicito vengono conteggiate', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 1, 0);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.totaleAttivi).toBe(0);
    // totaleAttivi è 0 ma patrimonioNetto deve comunque essere calcolato
    expect(kpi.patrimonioNetto).toBe(0);
  });

  it('non conta valori di altri anni', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2023, 12, 99999);
    upsertValore(db, v.id, 2024, 1, 500);
    const kpi = getKpiPatrimonio(db, 2024);
    expect(kpi.totaleAttivi).toBe(500);
  });
});

describe('cascading', () => {
  it('delete voce → cascade delete suoi valori', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 1, 1000);
    upsertValore(db, v.id, 2024, 2, 2000);
    db.prepare('DELETE FROM patrimonio_voci WHERE id = ?').run(v.id);
    expect(listValoriPerAnno(db, 2024)).toHaveLength(0);
  });

  it('delete gruppo → SET NULL su voci associate', () => {
    const g = createGruppo(db, 'Liquidità', 'attivo');
    const v = createVoce(db, 'Conto', 'attivo', g.id);
    deleteGruppo(db, g.id);
    const all = listVoci(db);
    expect(all.find((x) => x.id === v.id)?.gruppo_id).toBeNull();
  });
});

describe('findOrCreateGruppo', () => {
  it('crea un gruppo se non esiste', () => {
    const g = findOrCreateGruppo(db, 'Liquidità', 'attivo');
    expect(g.nome).toBe('Liquidità');
    expect(g.tipo).toBe('attivo');
    expect(listGruppi(db)).toHaveLength(1);
  });

  it('restituisce il gruppo esistente senza crearne uno nuovo', () => {
    const g1 = findOrCreateGruppo(db, 'Liquidità', 'attivo');
    const g2 = findOrCreateGruppo(db, 'Liquidità', 'attivo');
    expect(g1.id).toBe(g2.id);
    expect(listGruppi(db)).toHaveLength(1);
  });

  it('case-insensitive: "LIQUIDITÀ" trova "Liquidità"', () => {
    const g1 = findOrCreateGruppo(db, 'Liquidità', 'attivo');
    const g2 = findOrCreateGruppo(db, 'LIQUIDITÀ', 'attivo');
    expect(g1.id).toBe(g2.id);
  });

  it('stesso nome tipo diverso crea gruppi separati', () => {
    const g1 = findOrCreateGruppo(db, 'Investimenti', 'attivo');
    const g2 = findOrCreateGruppo(db, 'Investimenti', 'passivo');
    expect(g1.id).not.toBe(g2.id);
    expect(listGruppi(db)).toHaveLength(2);
  });
});

describe('getGranularita / setGranularita', () => {
  it('restituisce "mese" come default se non impostata', () => {
    expect(getGranularita(db)).toBe('mese');
  });

  it('setGranularita persiste in impostazioni e getGranularita la rileva', () => {
    setGranularita(db, 'quarter');
    expect(getGranularita(db)).toBe('quarter');
  });

  it('set poi reset a "mese"', () => {
    setGranularita(db, 'quarter');
    setGranularita(db, 'mese');
    expect(getGranularita(db)).toBe('mese');
  });
});

describe('countValoriNascosti', () => {
  it('restituisce 0 se nuova granularità è mese', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2025, 1, 100);
    upsertValore(db, v.id, 2025, 2, 200);
    expect(countValoriNascosti(db, 2025, 'mese')).toBe(0);
  });

  it('restituisce 0 se nessun valore nascosto passando a quarter', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2025, 3, 100);
    upsertValore(db, v.id, 2025, 6, 200);
    upsertValore(db, v.id, 2025, 9, 300);
    upsertValore(db, v.id, 2025, 12, 400);
    expect(countValoriNascosti(db, 2025, 'quarter')).toBe(0);
  });

  it('conta i mesi non-quarter (es. gennaio, febbraio)', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2025, 1, 100);
    upsertValore(db, v.id, 2025, 2, 200);
    upsertValore(db, v.id, 2025, 3, 300);
    expect(countValoriNascosti(db, 2025, 'quarter')).toBe(2);
  });

  it('conta solo i valori per l anno specificato', () => {
    const v = createVoce(db, 'Conto', 'attivo');
    upsertValore(db, v.id, 2024, 1, 100);
    upsertValore(db, v.id, 2025, 3, 300);
    expect(countValoriNascosti(db, 2025, 'quarter')).toBe(0);
    expect(countValoriNascosti(db, 2024, 'quarter')).toBe(1);
  });
});
