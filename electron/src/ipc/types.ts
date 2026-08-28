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
