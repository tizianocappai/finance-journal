# Installazione — No Budget

## Utenti finali

Scarica il pacchetto per la tua piattaforma dalla pagina [GitHub Releases](https://github.com/tizianocappai/finance-journal/releases). Non è richiesta nessuna dipendenza aggiuntiva.

### macOS (`.dmg`)

1. Apri il file `.dmg` scaricato.
2. Trascina **No Budget** nella cartella `/Applications`.
3. Se macOS mostra "Impossibile aprire l'app perché non può essere verificata":
   - **Clic destro → Apri** sull'icona dell'app.
   - Nella finestra di dialogo, clicca **Apri**.

In alternativa, da terminale:

```bash
xattr -cr /Applications/"No Budget.app"
```

### Windows (`.exe`)

Esegui il file `.exe` scaricato. L'installer Squirrel installa l'app e crea un collegamento nel menu Start. Nessuna conferma UAC richiesta.

### Linux (`.deb` / `.rpm`)

```bash
# Debian / Ubuntu
sudo dpkg -i no-budget_*.deb

# Fedora / RHEL
sudo rpm -i no-budget_*.rpm
```

---

## Dove vengono salvati i dati

Il database SQLite viene creato automaticamente alla prima esecuzione:

| Sistema | Percorso |
|---------|----------|
| macOS | `~/Library/Application Support/No Budget/finance.db` |
| Linux | `~/.config/No Budget/finance.db` |
| Windows | `%APPDATA%\No Budget\finance.db` |

Il file `.db` è l'unico artefatto da backuppare. Le Impostazioni dell'app espongono Export e Import del file DB per la portabilità cross-device.

---

## Developer

### Requisiti

- [Node.js](https://nodejs.org) LTS (18+)
- Git

### Installazione dipendenze

```bash
git clone https://github.com/tizianocappai/finance-journal.git
cd finance-journal/electron
npm install
```

### Avvio in modalità sviluppo

```bash
npm run dev
```

### Test

```bash
# Unit test (Vitest)
npm test

# Typecheck TypeScript
npm run typecheck

# E2E test (Playwright) — richiede build prima
npm run test:e2e
```

### Build e packaging

```bash
# Produce l'artefatto per la piattaforma corrente
npm run make
```

Gli artefatti vengono generati in `out/make/`.

### Struttura del progetto

```
electron/          ← tutto il codice dell'app
├── src/
│   ├── main/      ← Main Process (Node.js, accesso DB e filesystem)
│   ├── preload/   ← IPC Bridge (ContextBridge)
│   └── renderer/  ← Renderer Process (React + TypeScript)
├── e2e/           ← test Playwright
└── forge.config.ts
```
