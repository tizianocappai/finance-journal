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

export interface DettaglioConFrequenza extends Dettaglio {
  uso_count: number;
}

export interface MovimentoWithLookup extends Movimento {
  categoria_nome: string | null;
  metodo_nome: string | null;
  dettaglio_nome: string | null;
  dettaglio_categoria_id: number | null;
}

export interface SalvaMovimentoDettaglioOpts {
  nuovoDettaglio?: { nome: string; categoria_id: number };
  aggiornaCategoriaDettaglio?: { id: number; categoria_id: number };
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

export interface DashboardKPI {
  entrate: number;
  uscite: number;
  saldo: number;
  mesi_in_rosso: number;
}

export interface SerieMensile {
  mese: number;
  nome_mese: string;
  entrate: number;
  uscite: number;
}

export interface BreakdownCategoria {
  categoria_id: number | null;
  categoria_nome: string;
  totale: number;
}

export interface TrendYoY {
  entrate_anno_corrente: number;
  entrate_anno_precedente: number;
  uscite_anno_corrente: number;
  uscite_anno_precedente: number;
  saldo_anno_corrente: number;
  saldo_anno_precedente: number;
  mesi_in_rosso_anno_corrente: number;
  mesi_in_rosso_anno_precedente: number;
  delta_entrate_pct: number | null;
  delta_uscite_pct: number | null;
  delta_saldo_pct: number | null;
  delta_mesi_in_rosso: number | null;
}

export interface RiepilogoMensile {
  mese: number;
  nome_mese: string;
  entrate: number;
  uscite: number;
  saldo: number;
  delta: number | null;
}

export interface RiepilogoFooter {
  entrate: number;
  uscite: number;
  saldo: number;
}

export interface RiepilogoMensileResult {
  righe: RiepilogoMensile[];
  totale: RiepilogoFooter;
  media: RiepilogoFooter;
  mediana: RiepilogoFooter;
}

export interface PivotCategoriaRiga {
  categoria: string;
  mesi: number[];
  totale: number;
  media: number;
  mediana: number;
}

export interface TrendMensile {
  corrente: number[];
  precedente: number[];
}

export interface PatrimonioGruppo {
  id: number;
  nome: string;
  tipo: 'attivo' | 'passivo';
  ordine: number;
}

export interface PatrimonioVoce {
  id: number;
  nome: string;
  tipo: 'attivo' | 'passivo';
  gruppo_id: number | null;
  attiva: number;
  ordine: number;
  created_at: string;
}

export interface PatrimonioValore {
  id: number;
  voce_id: number;
  anno: number;
  mese: number;
  importo: number;
}

export interface KpiPatrimonio {
  totaleAttivi: number;
  totalePassivi: number;
  patrimonioNetto: number;
}
