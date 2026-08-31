# Spec: UX Refactor — Tab Impostazioni (ResocontoImpostazioniScreen)

## Objective

Semplificare l'usabilità del tab Impostazioni dentro Resoconto Personale.

**Utente:** Tiziano — usa il tab occasionalmente per gestire Dettagli, Categorie e Metodi.

**Problemi attuali:** scroll lungo con 5 sezioni impilate, gerarchia visiva debole, form di aggiunta sempre visibili, select categoria inline per ogni riga Dettagli, bottone "Salva preferenze" esplicito e inutile.

**Successo:** L'utente trova subito la sezione che cerca, la riga Dettagli è leggibile, aggiungere voci non occupa spazio permanente, le preferenze si salvano senza azione esplicita.

## Tech Stack

- Electron 44+ · React 19 · TypeScript · Vite
- React Router v6 (MemoryRouter)
- Tailwind CSS + `cn` utility (shadcn/ui pattern)
- Zustand (`useLookupStore`)
- SQLite via IPC bridge (`window.electronAPI`)
- Vitest (unit) · Playwright (e2e)

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
└── components/
    └── screens/
        └── ResocontoImpostazioniScreen.tsx  ← unico file modificato
```

## Comportamento target

### Accordion

- Le 5 sezioni (Categorie, Metodi di pagamento, Dettagli, Preferenze, CSV) sono racchiuse in accordion collassabili.
- **Default aperta:** solo Dettagli.
- **Multiple open:** l'utente può tenere aperte più sezioni contemporaneamente.
- Header accordion: titolo sezione + chevron ▾/▸. Niente pulsanti nell'header.

### EntityList (Categorie, Metodi di pagamento)

- La lista rimane invariata (riga con nome + badge "predefinita" + cestino).
- Il form di aggiunta è **collassabile**: in fondo alla lista compare il pulsante "+ Aggiungi [categoria|metodo]". Click espande il form inline. Il form si chiude automaticamente dopo aggiunta avvenuta.

### DettagliList

**Riga:**
```
[nome]  [categoria badge]  [Modifica ✎]
```
- Niente `<select>` inline. Niente cestino inline.
- La categoria è un badge testuale (o "— nessuna —" in muted se assente).
- Il pulsante "Modifica" apre il dialog.

**Dialog modifica dettaglio:**
- Campi: **nome** (input text) + **categoria** (select).
- Footer: `[Elimina]` (destructive, sx) · `[Annulla]` · `[Salva]` (primary, dx).
- Se il dettaglio ha movimenti associati, il click su "Elimina" non chiude il dialog ma mostra inline nel dialog stesso la select di riassegnazione + bottone conferma.
- Se non ha movimenti, "Elimina" elimina direttamente dopo conferma.

### Preferenze

- Nessun bottone "Salva preferenze".
- Ogni campo (`valuta`, `saldo_importo`, `saldo_data`) salva **on blur** via `window.electronAPI.impostazioni.set`.
- Feedback: checkmark `✓` discreto accanto al campo salvato, scompare dopo 2s.
- Errore: testo `text-destructive` sotto il campo.

### CSV

- Invariato rispetto all'implementazione attuale.

## Code Style

```tsx
// costanti stile al top del file
const BTN_BASE = 'rounded-md border px-3 py-1.5 text-sm ...';

// sub-componenti puri nello stesso file se piccoli
function AccordionSection({ title, defaultOpen, children }: ...) { ... }

// function components, niente classi
export default function ResocontoImpostazioniScreen() { ... }
```

- `try/catch` su ogni handler asincrono.
- Nessun commento descrittivo, solo WHY non ovvi.
- Nessun import di librerie esterne nuove senza approvazione.

## Testing Strategy

- Framework: Vitest (unit), Playwright (e2e).
- Nuovi test: non richiesti (refactoring UI puro, logica IPC invariata).
- Typecheck obbligatorio prima di considerare il lavoro completo.
- Non rompere nessun test esistente.

## Boundaries

- **Always:** `try/catch` su ogni handler asincrono; function components; typecheck verde.
- **Ask first:** modifiche a `ipc/types.ts`; nuove dipendenze npm; modifiche allo store Zustand.
- **Never:** class components; rimuovere funzionalità esistenti; modificare la logica IPC.

## Success Criteria

- [ ] Le 5 sezioni sono accordion collassabili; Dettagli è aperta di default.
- [ ] Più accordion possono essere aperti contemporaneamente.
- [ ] Il form di aggiunta in Categorie e Metodi è collassabile (nascosto di default).
- [ ] La riga Dettagli mostra: nome · categoria badge · pulsante Modifica. Niente select inline.
- [ ] Il dialog Dettagli permette di modificare nome e categoria.
- [ ] Il dialog Dettagli gestisce l'eliminazione (con riassegnazione se necessaria) senza uscire dal dialog.
- [ ] Le Preferenze si salvano on blur senza bottone esplicito, con checkmark di feedback.
- [ ] `npm run typecheck` passa senza errori.
- [ ] Nessun test esistente rotto.

## Open Questions

Nessuna — tutte le decisioni validate con l'utente nella sessione di grilling del 2026-08-30.
