export type DettaglioFormState =
  | { mode: 'existing'; id: number; categoria_id: number | null }
  | { mode: 'new'; nome: string }
  | { mode: 'empty' };

export interface MovimentoFormState {
  data: string;
  tipo: 'entrata' | 'uscita';
  importo: string;
  dettaglio: DettaglioFormState;
  categoria_id: string;
  metodo_id: string;
  nota: string;
}

export function validate(form: MovimentoFormState): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.data) errs.data = 'Data obbligatoria';
  const n = parseFloat(form.importo);
  if (!form.importo || isNaN(n) || n <= 0) errs.importo = 'Importo deve essere maggiore di zero';
  if (form.dettaglio.mode === 'empty') {
    errs.dettaglio = 'Dettaglio obbligatorio';
  } else if (form.dettaglio.mode === 'new' && !form.categoria_id) {
    errs.categoria_id = 'Categoria obbligatoria per il nuovo Dettaglio';
  } else if (form.dettaglio.mode === 'existing' && form.dettaglio.categoria_id == null && !form.categoria_id) {
    errs.categoria_id = 'Categoria obbligatoria';
  }
  return errs;
}
