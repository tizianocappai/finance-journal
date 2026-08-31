# Implementation Plan: UX Refactor — Tab Impostazioni

Spec di riferimento: `docs/specs/resoconto-impostazioni-ux-refactor.md`

## Overview

Refactoring UI puro di `ResocontoImpostazioniScreen.tsx`. Nessuna modifica a IPC, store, DB.
Cinque task sequenziali sullo stesso file. Logica esistente invariata — cambia solo la presentazione.

## Grafo dipendenze

```
Task 1: Accordion shell
├── Task 2: Form collassabile (EntityList)
├── Task 3: Riga Dettagli refactor
│   └── Task 4: Dialog modifica Dettaglio
└── Task 5: Preferenze auto-save
```

Task 2, 3, 5 sono indipendenti tra loro ma dipendono da Task 1.
Task 4 dipende da Task 3 (richiede il pulsante "Modifica" nella riga).

## Blocking edges

| Task | Blocca |
|------|--------|
| 1    | 2, 3, 5 |
| 3    | 4 |

---

## Phase 1: Struttura

### Task 1: Accordion shell — 5 sezioni collassabili

**Descrizione:** Aggiungere un sub-componente `AccordionSection` (stato aperto/chiuso locale) e wrappare le 5 sezioni esistenti (Categorie, Metodi, Dettagli, Preferenze, CSV). Dettagli aperta di default, tutte le altre chiuse. Multi-open: ogni sezione gestisce il proprio stato indipendentemente.

**Acceptance criteria:**
- [ ] `AccordionSection` accetta `title: string`, `defaultOpen?: boolean`, `children`
- [ ] Header mostra titolo + chevron (▾ aperto, ▸ chiuso), click togola
- [ ] Default: solo Dettagli è aperta al mount
- [ ] Aprire una sezione non chiude le altre
- [ ] Il contenuto delle sezioni chiuse è nascosto (non renderizzato o `hidden`)

**Verification:**
- [ ] `npm run typecheck` verde
- [ ] Visivo: le 5 sezioni sono accordion, Dettagli aperta di default

**Dependencies:** nessuna

**Files:** `electron/src/renderer/components/screens/ResocontoImpostazioniScreen.tsx`

**Scope:** S

---

### Checkpoint — Phase 1

- [ ] `npm run typecheck` verde
- [ ] `npm test` verde
- [ ] Accordion visibile e funzionante

---

## Phase 2: EntityList e Dettagli riga (parallelo logico, sequenziale in pratica)

### Task 2: Form aggiunta collassabile in EntityList

**Descrizione:** Nascondere il form di aggiunta (input + pulsante "+") dietro un pulsante "+ Aggiungi [label]" in fondo alla lista. Click espande il form inline. Dopo aggiunta avvenuta (`onAdd` risolto), il form si richiude automaticamente e il focus torna alla lista.

**Acceptance criteria:**
- [ ] Di default il form è nascosto; visibile solo il pulsante "+ Aggiungi …"
- [ ] Click sul pulsante mostra il form (input + bottone submit)
- [ ] Dopo aggiunta avvenuta il form si chiude automaticamente
- [ ] Errori restano visibili anche a form chiuso (o il form rimane aperto in caso di errore)
- [ ] Il pulsante "+ Aggiungi" è visibile solo quando la sezione accordion è aperta (comportamento naturale, niente logica extra)

**Verification:**
- [ ] `npm run typecheck` verde
- [ ] Visivo: form nascosto di default, si apre e chiude correttamente

**Dependencies:** Task 1

**Files:** `ResocontoImpostazioniScreen.tsx`

**Scope:** S

---

### Task 3: Riga Dettagli — rimozione select inline, aggiunta badge + pulsante Modifica

**Descrizione:** Eliminare la `<select>` categoria e il `<button>` cestino dalla riga. Sostituire con: nome · badge categoria (testo del nome categoria o "— nessuna —" in muted) · pulsante "Modifica" (icona pencil o testo). Il pulsante Modifica chiama un callback `onEdit(id)` (da implementare in Task 4).

**Acceptance criteria:**
- [ ] Nessuna `<select>` inline nella lista Dettagli
- [ ] Nessun cestino inline nella lista Dettagli
- [ ] La categoria è mostrata come badge testuale nella riga
- [ ] Se `categoria_id` è null, mostra "— nessuna —" in `text-muted-foreground`
- [ ] Pulsante "Modifica" presente per ogni riga; click chiama `onEdit(item.id)`

**Verification:**
- [ ] `npm run typecheck` verde
- [ ] Visivo: riga leggibile, badge visibile, pulsante Modifica presente

**Dependencies:** Task 1

**Files:** `ResocontoImpostazioniScreen.tsx`

**Scope:** S

---

### Checkpoint — Phase 2

- [ ] `npm run typecheck` verde
- [ ] `npm test` verde
- [ ] Accordion + form collassabile + riga Dettagli pulita funzionano insieme

---

## Phase 3: Dialog Dettagli e Preferenze auto-save

### Task 4: Dialog modifica Dettaglio (nome + categoria + eliminazione)

**Descrizione:** Aggiungere un sub-componente `DettaglioEditDialog` (modale centrato) con:
- Campi: input nome + select categoria
- Footer: `[Elimina]` (sx, destructive) · `[Annulla]` · `[Salva]` (dx, primary)
- Se click su "Elimina" e il dettaglio ha movimenti (`countMovimenti > 0`): mostrare inline nel dialog la select di riassegnazione + bottone "Conferma eliminazione"
- Se nessun movimento: eliminare direttamente

Il dialog si apre quando `DettagliList` riceve `onEdit(id)` (Task 3). Il dialog legge i dati dal dettaglio corrente tramite `items.find(d => d.id === editingId)`.

**Acceptance criteria:**
- [ ] Dialog si apre al click "Modifica", si chiude con "Annulla" o dopo "Salva"/"Elimina" riusciti
- [ ] "Salva" chiama `onUpdateCategoria` + rinomina dettaglio se il nome è cambiato (o solo `onUpdateCategoria` se la rinomina non è IPC-disponibile — verificare prima)
- [ ] "Elimina" senza movimenti: chiama `onDelete(id, fallbackId)` con fallback al primo altro dettaglio
- [ ] "Elimina" con movimenti: mostra inline select riassegnazione; "Conferma eliminazione" chiama `onDelete`
- [ ] Nessun dialog aperto se `editingId` è null

**Verification:**
- [ ] `npm run typecheck` verde
- [ ] Visivo: dialog si apre/chiude, salva categoria, gestisce eliminazione con e senza movimenti

**Dependencies:** Task 3

**Files:** `ResocontoImpostazioniScreen.tsx`

**Scope:** M

---

### Task 5: Preferenze — auto-save on blur + checkmark feedback

**Descrizione:** Rimuovere il bottone "Salva preferenze" e il `StatusMsg` globale. Ogni campo (`valuta`, `saldo_importo`, `saldo_data`) salva on `blur` chiamando `window.electronAPI.impostazioni.set`. Mostrare un checkmark `✓` discreto accanto al campo per 2s dopo salvataggio riuscito. In caso di errore, testo `text-destructive` sotto il campo.

**Acceptance criteria:**
- [ ] Nessun bottone "Salva preferenze"
- [ ] Ogni campo salva individualmente on blur
- [ ] Checkmark appare accanto al campo salvato e scompare dopo 2s
- [ ] Errore mostrato sotto il campo specifico che ha fallito
- [ ] I tre campi sono indipendenti (errore su valuta non impatta saldo)

**Verification:**
- [ ] `npm run typecheck` verde
- [ ] Visivo: tab → campo valuta → blur → checkmark appare e scompare

**Dependencies:** Task 1

**Files:** `ResocontoImpostazioniScreen.tsx`

**Scope:** S

---

### Checkpoint — Phase 3 (finale)

- [ ] `npm run typecheck` verde
- [ ] `npm test` verde
- [ ] Tutti i success criteria della spec soddisfatti
- [ ] Review manuale: accordion · form collassabile · riga Dettagli · dialog · auto-save

---

## Rischi

| Rischio | Impatto | Mitigazione |
|---------|---------|-------------|
| IPC per rinominare dettaglio non esiste | M | Verificare `window.electronAPI.dettagli` prima di Task 4; se manca, il campo nome è read-only nel dialog |
| `countMovimenti` lento su click Modifica | B | Chiamarlo solo all'apertura del dialog, non al mount |
| Checkmark timer non pulito su unmount | B | `useEffect` cleanup con `clearTimeout` |

## Open Questions

Nessuna.
