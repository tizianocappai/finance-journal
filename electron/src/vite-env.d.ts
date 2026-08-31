/// <reference types="vite/client" />

import type {
  Categoria,
  Granularita,
  MetodoPagamento,
  Dettaglio,
  DettaglioConFrequenza,
  Movimento,
  MovimentoWithLookup,
  MovimentoFilters,
  MovimentoCreate,
  MovimentoUpdate,
  SalvaMovimentoDettaglioOpts,
  DashboardKPI,
  SerieMensile,
  BreakdownCategoria,
  TrendYoY,
  RiepilogoMensileResult,
  PivotCategoriaRiga,
  TrendMensile,
  PatrimonioGruppo,
  PatrimonioVoce,
  PatrimonioValore,
  KpiPatrimonio,
  PatrimonioStorico,
} from './ipc/types';
import type { PreviewResult, ExecuteResult } from './ipc/import_csv';

declare global {
  interface Window {
    electronAPI: {
      categorie: {
        list: () => Promise<Categoria[]>;
        create: (data: { nome: string; colore?: string; icona?: string }) => Promise<Categoria>;
        update: (id: number, nome: string, colore?: string, icona?: string) => Promise<Categoria>;
        countMovimenti: (id: number) => Promise<number>;
        delete: (id: number, targetCategoriaId: number) => Promise<void>;
      };
      metodi_pagamento: {
        list: () => Promise<MetodoPagamento[]>;
        create: (data: { nome: string }) => Promise<MetodoPagamento>;
        delete: (id: number) => Promise<void>;
      };
      dettagli: {
        list: () => Promise<Dettaglio[]>;
        listPerFrequenza: () => Promise<DettaglioConFrequenza[]>;
        create: (data: { nome: string; categoria_id?: number }) => Promise<Dettaglio>;
        update: (id: number, nome: string, categoria_id?: number) => Promise<Dettaglio>;
        delete: (id: number, targetDettaglioId: number) => Promise<void>;
        updateCategoria: (id: number, categoria_id: number | null) => Promise<Dettaglio>;
        countMovimenti: (id: number) => Promise<number>;
      };
      movimenti: {
        list: (filters?: MovimentoFilters) => Promise<MovimentoWithLookup[]>;
        create: (data: MovimentoCreate) => Promise<Movimento>;
        update: (id: number, data: MovimentoUpdate) => Promise<Movimento>;
        createConDettaglio: (data: MovimentoCreate, opts: SalvaMovimentoDettaglioOpts) => Promise<Movimento>;
        updateConDettaglio: (id: number, data: MovimentoUpdate, opts: SalvaMovimentoDettaglioOpts) => Promise<Movimento>;
        delete: (id: number) => Promise<void>;
        restore: (movimento: Movimento) => Promise<void>;
        deleteAll: (filters?: MovimentoFilters) => Promise<Movimento[]>;
      };
      dashboard: {
        kpi: (anno: number) => Promise<DashboardKPI>;
        serieMensili: (anno: number) => Promise<SerieMensile[]>;
        breakdownCategorie: (anno: number) => Promise<BreakdownCategoria[]>;
        trendYoY: (anno: number) => Promise<TrendYoY>;
        riepilogoMensile: (anno: number) => Promise<RiepilogoMensileResult>;
        pivotCategorie: (anno: number, tipo: 'uscita' | 'entrata') => Promise<PivotCategoriaRiga[]>;
        trendMensile: (anno: number) => Promise<TrendMensile>;
      };
      fileOps: {
        exportCsv: () => Promise<{ path: string } | null>;
        exportJson: () => Promise<{ path: string } | null>;
        importDb: () => Promise<undefined | null>;
        importCsvPreview: () => Promise<PreviewResult | null>;
        importCsvExecute: (filePath: string) => Promise<ExecuteResult>;
      };
      impostazioni: {
        dbPath: () => Promise<string>;
        get: (chiave: string) => Promise<string | null>;
        set: (chiave: string, valore: string) => Promise<void>;
      };
      patrimonio: {
        getGranularita: () => Promise<Granularita>;
        setGranularita: (valore: Granularita) => Promise<void>;
        listGruppi: () => Promise<PatrimonioGruppo[]>;
        createGruppo: (nome: string, tipo: 'attivo' | 'passivo', ordine?: number) => Promise<PatrimonioGruppo>;
        updateGruppo: (id: number, nome: string, ordine?: number) => Promise<PatrimonioGruppo>;
        deleteGruppo: (id: number) => Promise<void>;
        listVoci: (soloAttive: boolean, anno?: number) => Promise<PatrimonioVoce[]>;
        createVoce: (nome: string, tipo: 'attivo' | 'passivo', gruppoNome?: string, ordine?: number) => Promise<PatrimonioVoce>;
        updateVoce: (id: number, updates: { nome?: string; gruppoNome?: string | null; ordine?: number }) => Promise<PatrimonioVoce>;
        archiveVoce: (id: number, anno: number) => Promise<void>;
        restoreVoce: (id: number) => Promise<void>;
        listValori: (anno: number) => Promise<PatrimonioValore[]>;
        upsertValore: (voceId: number, anno: number, mese: number, importo: number) => Promise<PatrimonioValore>;
        deleteValore: (voceId: number, anno: number, mese: number) => Promise<void>;
        getKpi: (anno: number) => Promise<KpiPatrimonio>;
        countValoriNascosti: (anno: number, nuovaGranularita: Granularita) => Promise<number>;
        getStorico: () => Promise<PatrimonioStorico>;
      };
    };
  }
}
