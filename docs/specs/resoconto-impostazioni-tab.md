# Spec: Chip tab "Impostazioni" nel Resoconto Personale

## Objective

Spostare le sezioni di configurazione legate al resoconto personale (Categorie, Metodi di pagamento,
Dettagli, Preferenze, Export CSV, Import CSV) dalla pagina globale `/impostazioni` in un nuovo terzo
chip tab **Impostazioni** dentro `ResocontoLayout`, affiancato ai tab Dashboard e Movimenti.

**Utente:** Tiziano — usa l'app quotidianamente per tracciare movimenti personali.

**Motivazione:** Le impostazioni di dominio (categorie, metodi, preferenze valuta/saldo) sono
concettualmente parte del resoconto, non della configurazione globale dell'app.

**Criterio di successo:** L'utente può raggiungere e usare tutte le funzionalità migrate senza mai
uscire dalla sezione Resoconto Personale.

## Tech Stack

- Electron 44+ con React 19, TypeScript, Vite
- React Router v6 (MemoryRouter — app Electron, no URL browser)
- Tailwind CSS + shadcn/ui pattern (cn utility)
- Zustand per state management
- SQLite via better-sqlite3 (IPC bridge)
- Vitest per unit test, Playwright per e2e

## Commands

```
Dev:        cd electron && npm run dev
Build:      cd electron && npm run build
Type check: cd electron && npm run typecheck
Test:       cd electron && npm test
Test e2e:   cd electron && npm run test:e2e
```

## Project Structure

```
electron/src/renderer/
├── App.tsx                          ← router — aggiungere route /resoconto/impostazioni
├── components/
│   ├── ResocontoLayout.tsx          ← aggiungere terza voce TABS
│   └── screens/
│       ├── DashboardScreen.tsx      ← invariato
│       ├── MovimentiScreen.tsx      ← invariato
│       ├── ImpostazioniScreen.tsx   ← rimuovere sezioni migrate
│       └── ResocontoImpostazioniScreen.tsx  ← NUOVO — sezioni migrate
```

## Code Style

Componenti function-only, niente classi. Stile costante con il file esistente:

```tsx
// costanti stile al top del file
const BTN_BASE = 'rounded-md border px-3 py-1.5 text-sm ...';
const BTN_MUTED = `${BTN_BASE} border-border bg-background ...`;

// sub-componenti puri nello stesso file se piccoli
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="mb-1 text-sm font-semibold text-foreground">{children}</h2>;
}

// esportazione default del componente principale
export default function ResocontoImpostazioniScreen() { ... }
```

Gestione errori: sempre `try/catch`. Nessun commento descrittivo, solo commenti per WHY non ovvi.

## Testing Strategy

- Framework: Vitest (unit), Playwright (e2e)
- Test esistenti: non rompere nessun test corrente
- Nuovi test: non richiesti per questa feature (refactoring di UI, logica invariata)
- Type check obbligatorio prima di considerare il lavoro completo

## Boundaries

- **Always:** `try/catch` su ogni handler asincrono; function components; typecheck verde
- **Ask first:** modifiche allo schema IPC o ai tipi in `ipc/types.ts`; aggiunta dipendenze
- **Never:** class components; rimuovere funzionalità esistenti; modificare la logica IPC

## Sezioni migrate vs rimaste

### Nuovo `ResocontoImpostazioniScreen` (`/resoconto/impostazioni`)
| Sezione | Descrizione |
|---------|-------------|
| Categorie | CRUD categorie custom |
| Metodi di pagamento | CRUD metodi custom |
| Dettagli | CRUD dettagli custom con categoria |
| Preferenze | Valuta, saldo iniziale importo/data |
| Esporta CSV | Export tutti i movimenti (snapshot completo) |
| Importa CSV | Import con modale di preview |

### `ImpostazioniScreen` residuo (`/impostazioni`)
| Sezione | Descrizione |
|---------|-------------|
| Database | Path file DB (read-only) |
| Aspetto | Tema chiaro/scuro/sistema |
| Dati | Esporta JSON, Importa database |
| Informazioni | Versione e nome app |

## Modifiche per file

### `ResocontoLayout.tsx`
- Aggiungere `{ label: 'Impostazioni', to: '/resoconto/impostazioni' }` a `TABS`

### `App.tsx`
- Import `ResocontoImpostazioniScreen`
- Aggiungere `<Route path="impostazioni" element={<ResocontoImpostazioniScreen />} />` dentro `/resoconto`

### `ImpostazioniScreen.tsx`
- Rimuovere sezioni: Categorie, Metodi, Dettagli, Preferenze, "Esporta CSV", "Importa CSV"
- Rimuovere import, state, handler, e sub-componenti usati solo dalle sezioni migrate
- Sezione "Dati" residua: mantenere solo Esporta JSON e Importa database
- Aggiornare `SectionDesc` di "Dati" di conseguenza

### `ResocontoImpostazioniScreen.tsx` (nuovo)
- Copiare da `ImpostazioniScreen.tsx` i blocchi: Categorie, Metodi, Dettagli, Preferenze
- Copiare handler: `handleExportCsv`, `handleImportCsv` e relativo modale preview CSV
- Copiare sub-componenti necessari: `SectionHeading`, `SectionDesc`, `StatusLine`, `EntityList`, `DettagliList`, helper `BTN_*`, `IMPOSTAZIONI_KEYS`
- Portare i soli import, state e useEffect necessari

## Success Criteria

- [ ] Chip tab "Impostazioni" visibile accanto a Dashboard e Movimenti in `ResocontoLayout`
- [ ] Navigazione a `/resoconto/impostazioni` funzionante tramite chip tab e direct link
- [ ] Tutte le sezioni migrate sono operative nel nuovo screen (CRUD, salva, export, import)
- [ ] La pagina `/impostazioni` mostra solo: Database, Aspetto, Dati (JSON+ImportDB), Informazioni
- [ ] `npm run typecheck` passa senza errori
- [ ] Nessun test esistente rotto

## Open Questions

Nessuna — tutte le decisioni sono state validate con l'utente.
