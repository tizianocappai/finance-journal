# No Budget

Applicazione desktop per il tracciamento personale delle finanze. Registra entrate e uscite, visualizza dashboard annuali con grafici, importa movimenti da CSV.

Sviluppata con PyQt6, dati salvati in SQLite locale — nessun cloud, nessun account.

---

## Funzionalità

- **Dashboard annuale** — KPI sintetici (totale entrate, uscite, saldo, mesi in rosso), grafico andamento mensile, breakdown uscite per categoria, confronto anno precedente
- **Gestione movimenti** — inserimento, modifica, eliminazione di entrate e uscite con categoria, dettaglio e metodo di pagamento
- **Import massivo da CSV** — importa storici da file CSV con mapping colonne configurabile
- **Categorie e dettagli custom** — estendi i set predefiniti con voci personalizzate
- **Metodi di pagamento custom** — contanti, carta o qualsiasi strumento tu voglia tracciare
- **Saldo iniziale** — imposta un punto di partenza contabile opzionale
- **Sezioni** — contesto Personale (implementato); contesto Casa in roadmap

---

## Installazione

Vedi [INSTALL.md](INSTALL.md) per istruzioni complete su clone, virtual environment e avvio.

**Requisiti minimi:** Python 3.11+

```bash
git clone https://github.com/tizianocappai/finance-journal.git
cd finance-journal
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
finance-journal
```

---

## Stack

| Componente | Tecnologia |
|------------|-----------|
| UI | PyQt6 |
| Grafici | matplotlib |
| Database | SQLite (locale) |
| Packaging | Briefcase (BeeWare) |
| Python | 3.11+ |

---

## Dati

Il database SQLite viene creato automaticamente alla prima esecuzione:

| Sistema | Percorso |
|---------|----------|
| macOS | `~/Library/Application Support/finance-journal/finance.db` |
| Linux | `~/.local/share/finance-journal/finance.db` |

---

## Stato del progetto

In sviluppo attivo. Funzionalità core stabili (movimenti, dashboard, import CSV). Roadmap: sezione Casa, distribuzione binaria macOS (`.dmg`), supporto Windows/Linux.
