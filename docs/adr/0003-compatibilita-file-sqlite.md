# ADR 0003 — Compatibilità file SQLite tra versione Python ed Electron

**Stato**: Accettato

## Contesto

L'app Python usa un file SQLite in `app.getPath('userData')` (via `platformdirs`). Gli utenti hanno già dati in quel file. La migrazione a Electron non deve richiedere export/import manuale dei dati.

## Decisione

L'app Electron usa lo stesso file SQLite, stesso path OS, stesso schema. `better-sqlite3` legge il file direttamente. Non è prevista alcuna migrazione schema: lo schema Python rimane il contratto.

Il path viene risolto tramite una funzione custom `getDbPath()` nel main process che replica esattamente platformdirs — **non** `app.getPath('userData')`, che diverge su Linux e Windows:

| OS | platformdirs (`user_data_dir`) | `app.getPath('userData')` |
|----|-------------------------------|---------------------------|
| macOS | `~/Library/Application Support/finance-journal/` | `~/Library/Application Support/finance-journal/` ✓ |
| Linux | `~/.local/share/finance-journal/` | `~/.config/finance-journal/` ✗ |
| Windows | `%LOCALAPPDATA%\finance-journal\finance-journal\` | `%APPDATA%\finance-journal\` ✗ |

`getDbPath()` implementa la stessa logica di platformdirs per ciascun OS.

## Alternative considerate

- **Nuovo file DB Electron**: libertà di schema ma perdita dati per l'utente. Inaccettabile.
- **Migrazione automatica one-time**: necessaria solo se lo schema cambia; al momento non previsto.

## Conseguenze

- Lo schema SQLite è un contratto: modifiche breaking richiedono una migration script esplicita.
- L'utente può passare da Python a Electron (e viceversa, durante la fase di sviluppo parallelo) senza perdere dati.
- Eventuali evolution dello schema futuro (seconda fase: movimenti ricorrenti, sezione Casa) devono essere retrocompatibili o gestite con ALTER TABLE / migration.
