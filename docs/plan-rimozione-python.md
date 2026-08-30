# Implementation Plan: Rimozione Python e riscrittura documentazione Electron

## Overview

Eliminare ogni artefatto Python dal repository e riscrivere la documentazione per riflettere lo stack Electron 44. Il lavoro è diviso in tre fasi: eliminazione file, aggiornamento doc esistenti, riscrittura doc principali.

## Architecture Decisions

- La pulizia file Python avviene via `git rm` per mantenere la storia git pulita
- `.venv/` e `.pytest_cache/` vengono rimossi dal filesystem ma probabilmente non erano tracciati da git (verificare prima)
- Nessuna modifica al codice Electron: questa spec tocca solo file da eliminare e file `.md`

## Task List

### Phase 1: Eliminazione file

---

## Task 1: Rimuovere file Python tracciati da git

**Description:** Rimuovere da git (e dal filesystem) tutti i file Python del progetto: il pacchetto `src/`, la suite `tests/`, `pyproject.toml` e gli artefatti build.

**Acceptance criteria:**
- [ ] `src/` non esiste più nel working tree
- [ ] `tests/` non esiste più nel working tree
- [ ] `pyproject.toml` non esiste più
- [ ] `git status` non mostra file Python come tracciati

**Verification:**
- [ ] `git status` pulito dopo staging
- [ ] `find . -name "*.py" -not -path "./.git/*" -not -path "./.venv/*"` restituisce 0 risultati

**Dependencies:** None

**Files likely touched:**
- `src/` (intera directory)
- `tests/` (intera directory)
- `pyproject.toml`
- `src/finance_journal.egg-info/` (build artifacts)

**Estimated scope:** Small (git rm ricorsivo)

---

## Task 2: Rimuovere documentazione obsoleta

**Description:** Eliminare i tre file di documentazione che non hanno più utilità: i due ADR sulla migrazione Python→Electron e l'analisi del gap.

**Acceptance criteria:**
- [ ] `docs/adr/0002-migrazione-stack-electron.md` eliminato
- [ ] `docs/adr/0003-compatibilita-file-sqlite.md` eliminato
- [ ] `docs/research/python-vs-electron-gap.md` eliminato

**Verification:**
- [ ] `ls docs/adr/` mostra solo 0001 e 0004
- [ ] `ls docs/research/` vuota o directory rimossa

**Dependencies:** None (parallelo con Task 1)

**Files likely touched:**
- `docs/adr/0002-migrazione-stack-electron.md`
- `docs/adr/0003-compatibilita-file-sqlite.md`
- `docs/research/python-vs-electron-gap.md`

**Estimated scope:** XS

---

### Checkpoint: Phase 1

- [ ] Nessun file `.py` tracciato da git
- [ ] Nessun ADR Python presente
- [ ] `git diff --stat` mostra solo eliminazioni

---

### Phase 2: Aggiornamento doc esistenti

I task 3-6 sono indipendenti tra loro e possono essere eseguiti in parallelo.

---

## Task 3: Aggiornare CONTEXT.md

**Description:** Rimuovere l'unico riferimento Python rimasto in CONTEXT.md: la menzione di `platformdirs` come equivalente Python di `app.getPath('userData')`.

**Acceptance criteria:**
- [ ] Nessuna menzione di `platformdirs`, Python o PyQt6 in `CONTEXT.md`

**Verification:**
- [ ] `grep -i "python\|pyqt\|platformdirs\|pip" CONTEXT.md` → nessun risultato

**Dependencies:** None

**Files likely touched:**
- `CONTEXT.md`

**Estimated scope:** XS

---

## Task 4: Aggiornare spec-azioni-riga-movimenti.md

**Description:** Sostituire i riferimenti allo stack Python con quelli Electron: stack indicato come "Python 3.12+, PyQt6" → Electron 44 + React; comandi `pytest` e `python3 -m finance_journal` → `npm test` e `npm run dev`.

**Acceptance criteria:**
- [ ] Stack aggiornato a Electron 44 + React + TypeScript
- [ ] Comandi aggiornati a `npm test` / `npm run dev`
- [ ] Nessuna menzione di PyQt6, pytest, `python3`

**Verification:**
- [ ] `grep -i "python\|pyqt\|pytest\|pip" docs/spec-azioni-riga-movimenti.md` → nessun risultato

**Dependencies:** None

**Files likely touched:**
- `docs/spec-azioni-riga-movimenti.md`

**Estimated scope:** Small

---

## Task 5: Aggiornare spec-sezione-personale.md

**Description:** Sostituire la descrizione dell'app come "Python (PyQt6)" con Electron; aggiornare `Framework GUI: PyQt6` con `Electron 44 + React`; rimuovere qualsiasi altra menzione Python.

**Acceptance criteria:**
- [ ] App descritta come applicazione Electron desktop
- [ ] `Framework GUI` aggiornato a Electron + React
- [ ] Nessuna menzione di PyQt6, matplotlib, Python

**Verification:**
- [ ] `grep -i "python\|pyqt\|matplotlib\|pip" docs/spec-sezione-personale.md` → nessun risultato

**Dependencies:** None

**Files likely touched:**
- `docs/spec-sezione-personale.md`

**Estimated scope:** Small

---

## Task 6: Aggiornare spec-icona-app.md

**Description:** Rimuovere la nota "PyQt6 sarà dismessa" dalla sezione "Fuori scope".

**Acceptance criteria:**
- [ ] Nessuna menzione di PyQt6 nel file

**Verification:**
- [ ] `grep -i "python\|pyqt" docs/spec-icona-app.md` → nessun risultato

**Dependencies:** None

**Files likely touched:**
- `docs/spec-icona-app.md`

**Estimated scope:** XS

---

### Checkpoint: Phase 2

- [ ] `grep -ri "python\|pyqt\|platformdirs\|pip install\|pytest" docs/ CONTEXT.md` → nessun risultato (eccetto questo plan e la spec)

---

### Phase 3: Riscrittura documentazione principale

---

## Task 7: Riscrivere README.md

**Description:** Riscrivere README.md da zero focalizzato su Electron. Struttura: descrizione app → download binario → installazione per piattaforma → dev setup → test.

**Acceptance criteria:**
- [ ] Sezione download con link GitHub Releases per macOS (dmg), Windows (exe), Linux (deb/rpm)
- [ ] Sezione dev setup: prerequisiti Node, `git clone`, `npm install`, `npm run dev`
- [ ] Sezione test: `npm test` (Vitest) e `npm run test:e2e` (Playwright)
- [ ] Nessuna menzione di Python, pip, PyQt6, `python3`

**Verification:**
- [ ] `grep -i "python\|pyqt\|pip\|python3\|pytest" README.md` → nessun risultato
- [ ] README leggibile e completo (revisione manuale)

**Dependencies:** Task 1 (concettuale: Python è già eliminato)

**Files likely touched:**
- `README.md`

**Estimated scope:** Medium

---

## Task 8: Riscrivere INSTALL.md

**Description:** Riscrivere INSTALL.md da zero. Due sezioni: utenti finali (download binario, zero dipendenze) e developer (Node, clone, build locale).

**Acceptance criteria:**
- [ ] Sezione utenti finali: istruzioni per macOS, Windows, Linux con formati corretti
- [ ] Sezione developer: Node, clone, `npm install`, `npm run dev`, `npm run make`
- [ ] Nessuna menzione di Python, pip, PyQt6, venv

**Verification:**
- [ ] `grep -i "python\|pyqt\|pip\|venv\|python3" INSTALL.md` → nessun risultato
- [ ] INSTALL.md leggibile e completo (revisione manuale)

**Dependencies:** Task 1 (concettuale)

**Files likely touched:**
- `INSTALL.md`

**Estimated scope:** Medium

---

### Checkpoint: Final

- [ ] `grep -ri "python\|pyqt\|pip install\|python3\|pytest\|platformdirs" . --include="*.md" --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir=".venv"` → nessun risultato (eccetto questo plan e la spec stessa)
- [ ] `find . -name "*.py" -not -path "./.git/*"` → nessun risultato
- [ ] `ls src/` → directory non esiste
- [ ] `ls tests/` → directory non esiste

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `.venv/` o `.pytest_cache/` già ignorati da `.gitignore` | Basso | Verificare con `git ls-files src/ tests/` prima del `git rm` |
| Link GitHub Releases non ancora esistenti | Medio | Usare placeholder `[link]` nel README, da aggiornare dopo il primo release |
| Spec di feature con dipendenze non viste | Basso | Grep completo a fine Phase 2 |

## Parallelization Opportunities

- **Task 1 + Task 2**: paralleli (entrambe eliminazioni indipendenti)
- **Task 3 + Task 4 + Task 5 + Task 6**: paralleli (file diversi, nessuna dipendenza)
- **Task 7 + Task 8**: paralleli (file diversi, nessuna dipendenza)
