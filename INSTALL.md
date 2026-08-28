# Installazione — Finance Journal

## Requisiti

- Python 3.11 o superiore
- Git

Verifica la versione installata:

```bash
python3 --version
```

## 1. Clona il repository

```bash
git clone https://github.com/tizianocappai/finance-journal.git
cd finance-journal
```

## 2. Crea il virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Il prompt cambierà mostrando `(.venv)` — indica che l'ambiente è attivo.

## 3. Installa le dipendenze

```bash
pip install -e .
```

Questo installa l'applicazione in modalità editabile insieme a tutte le dipendenze (PyQt6, matplotlib, platformdirs).

## 4. Avvia l'applicazione

```bash
finance-journal
```

In alternativa:

```bash
python -m finance_journal
```

## Dove vengono salvati i dati

Il database SQLite viene creato automaticamente alla prima esecuzione:

| Sistema | Percorso |
|---------|----------|
| macOS   | `~/Library/Application Support/finance-journal/finance.db` |
| Linux   | `~/.local/share/finance-journal/finance.db` |

Non è necessario creare la cartella manualmente.

## Avvii successivi

Ogni volta che apri un nuovo terminale, riattiva il virtual environment prima di avviare l'app:

```bash
source .venv/bin/activate
finance-journal
```

## Disinstallazione

Elimina la cartella del progetto e, se vuoi rimuovere anche i dati:

```bash
# macOS
rm -rf ~/Library/Application\ Support/finance-journal

# Linux
rm -rf ~/.local/share/finance-journal
```
