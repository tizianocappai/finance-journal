export interface Categoria {
  id: number;
  nome: string;
  colore: string | null;
  icona: string | null;
  predefinita: number;
  created_at: string;
}

export interface MetodoPagamento {
  id: number;
  nome: string;
  predefinito: number;
  created_at: string;
}

export interface Dettaglio {
  id: number;
  nome: string;
  categoria_id: number | null;
  predefinito: number;
  created_at: string;
}

export interface Movimento {
  id: number;
  data: string;
  importo: number;
  tipo: 'entrata' | 'uscita';
  descrizione: string | null;
  categoria_id: number | null;
  metodo_id: number | null;
  dettaglio_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface MovimentoWithLookup extends Movimento {
  categoria_nome: string | null;
  metodo_nome: string | null;
}

export interface MovimentoFilters {
  anno?: number;
  mese?: number;
  tipo?: 'entrata' | 'uscita';
  categoria_id?: number;
  metodo_id?: number;
  testo?: string;
}

export interface MovimentoCreate {
  data: string;
  importo: number;
  tipo: 'entrata' | 'uscita';
  descrizione?: string | null;
  categoria_id?: number | null;
  metodo_id?: number | null;
  dettaglio_id?: number | null;
}

export interface MovimentoUpdate {
  data: string;
  importo: number;
  tipo: 'entrata' | 'uscita';
  descrizione?: string | null;
  categoria_id?: number | null;
  metodo_id?: number | null;
  dettaglio_id?: number | null;
}
