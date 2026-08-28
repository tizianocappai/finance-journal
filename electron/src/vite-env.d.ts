/// <reference types="vite/client" />

import type {
  Categoria,
  MetodoPagamento,
  Dettaglio,
  Movimento,
  MovimentoWithLookup,
  MovimentoFilters,
  MovimentoCreate,
  MovimentoUpdate,
  DashboardKPI,
  SerieMensile,
  BreakdownCategoria,
  TrendYoY,
} from './ipc/types';

declare global {
  interface Window {
    electronAPI: {
      categorie: {
        list: () => Promise<Categoria[]>;
        create: (data: { nome: string; colore?: string; icona?: string }) => Promise<Categoria>;
        delete: (id: number) => Promise<void>;
      };
      metodi_pagamento: {
        list: () => Promise<MetodoPagamento[]>;
        create: (data: { nome: string }) => Promise<MetodoPagamento>;
        delete: (id: number) => Promise<void>;
      };
      dettagli: {
        list: () => Promise<Dettaglio[]>;
        create: (data: { nome: string; categoria_id?: number }) => Promise<Dettaglio>;
        delete: (id: number) => Promise<void>;
        updateCategoria: (id: number, categoria_id: number | null) => Promise<Dettaglio>;
      };
      movimenti: {
        list: (filters?: MovimentoFilters) => Promise<MovimentoWithLookup[]>;
        create: (data: MovimentoCreate) => Promise<Movimento>;
        update: (id: number, data: MovimentoUpdate) => Promise<Movimento>;
        delete: (id: number) => Promise<void>;
      };
      dashboard: {
        kpi: (anno: number) => Promise<DashboardKPI>;
        serieMensili: (anno: number) => Promise<SerieMensile[]>;
        breakdownCategorie: (anno: number) => Promise<BreakdownCategoria[]>;
        trendYoY: (anno: number) => Promise<TrendYoY>;
      };
    };
  }
}
