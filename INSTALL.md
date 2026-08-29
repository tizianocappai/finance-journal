# Installazione — No Budget (Finance Journal)

## Versione Electron (raccomandato)

L'app è disponibile come applicazione nativa per macOS, Windows e Linux tramite Electron Forge.

### Requisiti

- Node.js 18+
- pnpm 8+

### Installazione da sorgente

```bash
git clone https://github.com/tizianocappai/finance-journal.git
cd finance-journal/electron
pnpm install
```

### Avvio in modalità sviluppo

```bash
pnpm dev
```

### Build e packaging

```bash
# Produce l'artefatto per la piattaforma corrente
pnpm make
```

Gli artefatti vengono generati nella cartella `out/make/`.

### macOS — apertura del `.dmg`

Il `.dmg` non è firmato con un certificato Apple Developer. Per aprirlo:

1. Fai doppio clic sul `.dmg` per montarlo.
2. Se macOS mostra "Impossibile aprire l'app perché non può essere verificata", **non usare** il pulsante predefinito.
3. **Clic destro → Apri** sull'icona dell'app all'interno del `.dmg`.
4. Nella finestra di dialogo, clicca **Apri** per avviare l'app.

In alternativa, da terminale:

```bash
xattr -cr /Applications/"No Budget.app"
```

### Dove vengono salvati i dati

Il database SQLite viene creato automaticamente alla prima esecuzione:

| Sistema | Percorso |
|---------|----------|
| macOS   | `~/Library/Application Support/No Budget/finance.db` |
| Linux   | `~/.config/No Budget/finance.db` |
| Windows | `%APPDATA%\No Budget\finance.db` |

---

## Versione Python (legacy)

### Requisiti

- Python 3.11 o superiore
- Git

Verifica la versione installata:

```bash
python3 --version
```

### 1. Clona il repository

```bash
git clone https://github.com/tizianocappai/finance-journal.git
cd finance-journal
```

### 2. Crea il virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Il prompt cambierà mostrando `(.venv)` — indica che l'ambiente è attivo.

### 3. Installa le dipendenze

```bash
pip install -e .
```

Questo installa l'applicazione in modalità editabile insieme a tutte le dipendenze (PyQt6, matplotlib, platformdirs).

### 4. Avvia l'applicazione

```bash
finance-journal
```

In alternativa:

```bash
python -m finance_journal
```

### Dove vengono salvati i dati

Il database SQLite viene creato automaticamente alla prima esecuzione:

| Sistema | Percorso |
|---------|----------|
| macOS   | `~/Library/Application Support/finance-journal/finance.db` |
| Linux   | `~/.local/share/finance-journal/finance.db` |

Non è necessario creare la cartella manualmente.

### Avvii successivi

Ogni volta che apri un nuovo terminale, riattiva il virtual environment prima di avviare l'app:

```bash
source .venv/bin/activate
finance-journal
```

### Disinstallazione

Elimina la cartella del progetto e, se vuoi rimuovere anche i dati:

```bash
# macOS
rm -rf ~/Library/Application\ Support/finance-journal

# Linux
rm -rf ~/.local/share/finance-journal
```
