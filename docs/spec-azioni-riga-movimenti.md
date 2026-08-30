# Spec — Azioni inline per riga Movimento

## Objective

Sostituire il doppio-click sulla riga della tabella Movimenti con pulsanti "Modifica" e "Elimina" sempre visibili su ogni riga. L'obiettivo è rendere le azioni discoverable senza richiedere di conoscere la gesture del doppio-click.

**Utente**: chiunque usi la sezione Movimenti di Finance Journal.

**Successo**: l'utente può modificare o eliminare un Movimento con un singolo click sull'apposito pulsante, senza dover fare doppio-click sulla riga né cercare l'azione all'interno di un dialog.

## Tech Stack

- Electron 44 + React + TypeScript
- SQLite (via `better-sqlite3`)
- Vitest per i test unitari, Playwright per i test e2e

## Commands

```bash
Test:  cd electron && npm test
E2E:   cd electron && npm run test:e2e
Run:   cd electron && npm run dev
```

## Project Structure

```
electron/src/
├── renderer/
│   └── components/
│       ├── MovimentiTable.tsx    ← tabella movimenti — file principale da modificare
│       └── MovimentoDialog.tsx   ← dialog modifica — rimuovere pulsante "Elimina"
```

## Decisioni di design (da grilling)

| Decisione | Scelta |
|---|---|
| Azioni per riga | "Modifica" + "Elimina" (testo breve) |
| Visibilità | Sempre visibili, non solo al hover |
| Doppio click | Rimosso |
| Conferma eliminazione | Dialog sempre (`QMessageBox.question`) |
| Bottone "Elimina" nel dialog Modifica | Rimosso |
| Header colonna azioni | Vuota (stringa `""`) |

## Code Style

I pulsanti azione vanno resi inline nella riga della tabella come componente React. Ogni riga include una cella con due `<button>` ("Modifica" ed "Elimina") che ricevono l'id del Movimento via props e chiamano le callback appropriate.

```tsx
// pattern per la cella azioni in MovimentiTable.tsx
<td>
  <button onClick={() => onModifica(movimento.id)}>Modifica</button>
  <button style={{ color: '#c62828' }} onClick={() => onElimina(movimento.id)}>Elimina</button>
</td>
```

## Testing Strategy

Le funzioni repository (`create`, `update`, `delete`) sono già testate con Vitest. Non servono nuovi test unitari per il layer UI. La verifica avviene manualmente eseguendo l'app con `npm run dev`, oppure tramite test Playwright se il flusso è incluso in `e2e/`.

## Boundaries

- **Always**: non rimuovere il dialog di conferma per l'eliminazione; la colonna azioni è sempre l'ultima
- **Ask first**: qualsiasi cambio alla firma di `MovimentoDialog.__init__`
- **Never**: usare `cellDoubleClicked` per la modifica dopo questa modifica

## Success Criteria

- [ ] La tabella Movimenti mostra una colonna azioni senza header contenente i pulsanti "Modifica" ed "Elimina" per ogni riga
- [ ] Click su "Modifica" apre `MovimentoDialog` con i dati del Movimento selezionato
- [ ] Click su "Elimina" mostra un `QMessageBox.question` di conferma; alla conferma il Movimento viene eliminato e la tabella aggiornata
- [ ] Annullare la conferma lascia il Movimento invariato
- [ ] Il doppio-click sulla riga non fa nulla
- [ ] `MovimentoDialog` non contiene più il pulsante "Elimina" né la logica `is_deleted()`
- [ ] Tutti i test esistenti passano

## Open Questions

Nessuna — tutte le decisioni risolte in sessione di grilling.
