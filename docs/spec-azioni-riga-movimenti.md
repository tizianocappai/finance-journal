# Spec — Azioni inline per riga Movimento

## Objective

Sostituire il doppio-click sulla riga della tabella Movimenti con pulsanti "Modifica" e "Elimina" sempre visibili su ogni riga. L'obiettivo è rendere le azioni discoverable senza richiedere di conoscere la gesture del doppio-click.

**Utente**: chiunque usi la sezione Movimenti di Finance Journal.

**Successo**: l'utente può modificare o eliminare un Movimento con un singolo click sull'apposito pulsante, senza dover fare doppio-click sulla riga né cercare l'azione all'interno di un dialog.

## Tech Stack

- Python 3.12+, PyQt6
- SQLite (via `sqlite3` stdlib)
- pytest per i test

## Commands

```
Test:  source .venv/bin/activate && python3 -m pytest tests/ -x -q
Run:   source .venv/bin/activate && python3 -m finance_journal
```

## Project Structure

```
src/finance_journal/
├── ui/
│   ├── movimenti.py          ← tabella movimenti — file principale da modificare
│   └── movimento_dialog.py   ← dialog modifica — rimuovere bottone "Elimina"
tests/
└── (nessun nuovo test UI — la logica repository è già coperta)
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

Il pulsante azione va inserito via `setCellWidget`. Ogni riga usa un `QWidget` container con `QHBoxLayout` contenente i due `QPushButton`. La connessione al segnale usa `lambda row=row: self._on_modifica(row)` per catturare l'indice correttamente nel loop.

```python
# pattern per ogni riga in _load_table
cell = QWidget()
lay = QHBoxLayout(cell)
lay.setContentsMargins(2, 2, 2, 2)
lay.setSpacing(4)
btn_mod = QPushButton("Modifica")
btn_mod.clicked.connect(lambda checked=False, r=row: self._on_modifica(r))
btn_del = QPushButton("Elimina")
btn_del.setStyleSheet("color: #c62828;")
btn_del.clicked.connect(lambda checked=False, r=row: self._on_elimina(r))
lay.addWidget(btn_mod)
lay.addWidget(btn_del)
self._table.setCellWidget(row, len(_COLS), cell)
```

## Testing Strategy

Le funzioni repository (`create`, `update`, `delete`) sono già testate. Non servono nuovi test di unità per il layer UI (PyQt6 non è testabile headless in questo setup). La verifica avviene manualmente eseguendo l'app.

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
