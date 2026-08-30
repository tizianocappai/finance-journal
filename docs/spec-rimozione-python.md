# Spec: Rimozione Python e riscrittura documentazione Electron

## Objective

Eliminare ogni traccia del progetto Python (PyQt6) dal repository e riscrivere tutta la documentazione per riflettere l'unico stack attivo: Electron 44 + Vitest + Playwright.

L'app è un finance journal desktop già migrato completamente a Electron. Il codice Python non viene più eseguito né mantenuto. La documentazione che ne parla crea confusione e riferisce uno stack morto.

**Success criteria:**
- Nessun file `.py`, `pyproject.toml`, `.venv/`, `tests/`, `.pytest_cache/` nel working tree tracciato da git
- Nessuna menzione di Python, PyQt6, pip, pytest, `python3` nei file `.md` del repo (eccetto nei file ADR come record storico — ma questi vengono eliminati)
- `README.md` e `INSTALL.md` descrivono solo Electron: download binario + dev setup Node
- Le spec di feature non citano più PyQt6 o Python come runtime
- `CONTEXT.md` non contiene più riferimenti a `platformdirs` Python

## Tech Stack

- **Runtime:** Electron 44
- **Frontend:** React + TypeScript + Vite
- **DB:** SQLite (better-sqlite3)
- **Unit test:** Vitest 3
- **E2E test:** Playwright 1.62
- **Packaging:** Electron Forge (dmg, exe, deb, rpm)
- **Node:** nessun vincolo esplicito (`engines` non definito in package.json)

## Commands

```bash
# Dev
cd electron && npm run dev

# Build + package
cd electron && npm run make

# Unit test
cd electron && npm test

# E2E test
cd electron && npm run test:e2e

# Typecheck
cd electron && npm run typecheck
```

## Project Structure (dopo la pulizia)

```
/
├── CLAUDE.md
├── CLAUDE.local.md
├── CONTEXT.md               ← glossario dominio (solo Electron)
├── README.md                ← riscritto per Electron
├── INSTALL.md               ← riscritto per Electron
├── docs/
│   ├── adr/
│   │   ├── 0001-sqlite-come-unico-storage.md     ← intatto
│   │   └── 0004-ipc-contextbridge-canali-tipizzati.md  ← intatto
│   ├── agents/              ← intatto
│   ├── spec-azioni-riga-movimenti.md   ← aggiornato
│   ├── spec-sezione-personale.md       ← aggiornato
│   └── spec-icona-app.md               ← aggiornato
└── electron/                ← codice app Electron (invariato)
```

## Boundaries

- **Always:** aggiornare la spec se cambiano le decisioni durante l'implementazione
- **Ask first:** eliminare ADR 0001 o 0004 (non previsto da questa spec)
- **Never:** lasciare riferimenti a `PyQt6`, `pip`, `python3`, `pytest` nei file `.md` (eccetto testo storico già eliminato con gli ADR)

## File da eliminare (git rm)

| Percorso | Motivo |
|---|---|
| `src/` | Pacchetto Python + egg-info |
| `tests/` | Suite pytest |
| `pyproject.toml` | Config progetto Python |
| `.venv/` | Virtual environment (se tracciato) |
| `.pytest_cache/` | Cache pytest (se tracciato) |
| `docs/adr/0002-migrazione-stack-electron.md` | Storia conclusa |
| `docs/adr/0003-compatibilita-file-sqlite.md` | Storia conclusa |
| `docs/research/python-vs-electron-gap.md` | Analisi obsoleta |

## File da riscrivere da zero

### README.md

Struttura:
1. Titolo + descrizione breve (app finance journal desktop)
2. Screenshot / badge (opzionale)
3. **Download** — link GitHub Releases, formati per piattaforma
4. **Installazione** — istruzioni per macOS (dmg), Windows (exe), Linux (deb/rpm)
5. **Dev setup** — prerequisiti Node, clone, `npm install`, `npm run dev`
6. **Test** — `npm test` + `npm run test:e2e`
7. Licenza

### INSTALL.md

Struttura:
1. **Utenti finali** — download binario, nessuna dipendenza
2. **Developer** — Node, clone repo, dipendenze, dev server, build locale

## File da aggiornare (rimuovere refs Python)

| File | Intervento |
|---|---|
| `docs/spec-azioni-riga-movimenti.md` | Sostituire stack `Python 3.12+, PyQt6` con Electron/Node; aggiornare comandi da `pytest`/`python3` a `npm test`/`npm run dev` |
| `docs/spec-sezione-personale.md` | Sostituire descrizione "Python (PyQt6)" con Electron; aggiornare `Framework GUI: PyQt6` con `Electron 44 + React` |
| `docs/spec-icona-app.md` | Rimuovere nota "PyQt6 sarà dismessa" |
| `CONTEXT.md` | Rimuovere riferimento a `platformdirs` Python |

## Open Questions

Nessuna — grilling completato.
