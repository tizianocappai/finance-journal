import { describe, expect, it } from 'vitest';
import { validate } from '../lib/movimentoValidate';
import type { MovimentoFormState, DettaglioFormState } from '../lib/movimentoValidate';

function baseForm(dettaglio: DettaglioFormState, categoria_id = ''): MovimentoFormState {
  return {
    data: '2024-01-01',
    tipo: 'uscita',
    importo: '50',
    dettaglio,
    categoria_id,
    metodo_id: '',
    nota: '',
  };
}

describe('validate — campo Dettaglio', () => {
  it('mode:empty → errore dettaglio obbligatorio', () => {
    const errs = validate(baseForm({ mode: 'empty' }));
    expect(errs.dettaglio).toBeTruthy();
  });

  it('mode:existing con categoria_id → nessun errore', () => {
    const errs = validate(baseForm({ mode: 'existing', id: 1, categoria_id: 2 }, '2'));
    expect(errs.dettaglio).toBeUndefined();
    expect(errs.categoria_id).toBeUndefined();
  });

  it('mode:new senza categoria_id → errore categoria obbligatoria', () => {
    const errs = validate(baseForm({ mode: 'new', nome: 'NuovoBar' }, ''));
    expect(errs.categoria_id).toBeTruthy();
    expect(errs.dettaglio).toBeUndefined();
  });

  it('mode:new con categoria_id → nessun errore', () => {
    const errs = validate(baseForm({ mode: 'new', nome: 'NuovoBar' }, '3'));
    expect(errs.categoria_id).toBeUndefined();
    expect(errs.dettaglio).toBeUndefined();
  });

  it('mode:existing con categoria_id=null e senza categoria_id form → errore categoria', () => {
    const errs = validate(baseForm({ mode: 'existing', id: 1, categoria_id: null }, ''));
    expect(errs.categoria_id).toBeTruthy();
  });

  it('mode:existing con categoria_id=null ma categoria_id fornita → nessun errore', () => {
    const errs = validate(baseForm({ mode: 'existing', id: 1, categoria_id: null }, '5'));
    expect(errs.categoria_id).toBeUndefined();
  });
});

describe('validate — importo e data', () => {
  it('importo vuoto → errore', () => {
    const errs = validate({ ...baseForm({ mode: 'existing', id: 1, categoria_id: 2 }, '2'), importo: '' });
    expect(errs.importo).toBeTruthy();
  });

  it('importo zero → errore', () => {
    const errs = validate({ ...baseForm({ mode: 'existing', id: 1, categoria_id: 2 }, '2'), importo: '0' });
    expect(errs.importo).toBeTruthy();
  });

  it('importo negativo → errore', () => {
    const errs = validate({ ...baseForm({ mode: 'existing', id: 1, categoria_id: 2 }, '2'), importo: '-5' });
    expect(errs.importo).toBeTruthy();
  });

  it('data vuota → errore', () => {
    const errs = validate({ ...baseForm({ mode: 'existing', id: 1, categoria_id: 2 }, '2'), data: '' });
    expect(errs.data).toBeTruthy();
  });
});
