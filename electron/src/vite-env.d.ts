/// <reference types="vite/client" />

import type { Categoria, MetodoPagamento, Dettaglio } from './ipc/types';

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
    };
  }
}
