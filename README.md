# No Budget

Applicazione desktop per il tracciamento personale delle finanze. Registra entrate e uscite, visualizza dashboard annuali con grafici, importa movimenti da CSV.

Sviluppata con Electron — dati salvati in SQLite locale, nessun cloud, nessun account.

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

## Download

Scarica l'ultima versione dalla pagina [GitHub Releases](https://github.com/tizianocappai/finance-journal/releases):

| Piattaforma | Formato |
|-------------|---------|
| macOS | `.dmg` |
| Windows | `.exe` (Squirrel installer) |
| Linux | `.deb` / `.rpm` |

Nessuna dipendenza da installare — apri il pacchetto e avvia l'app.

> **macOS**: il `.dmg` non è firmato. Se macOS blocca l'apertura, fai **clic destro → Apri** sull'icona dell'app, poi clicca **Apri** nella finestra di dialogo.

Vedi [INSTALL.md](INSTALL.md) per istruzioni dettagliate su ogni piattaforma.

---

## Stack

| Componente | Tecnologia |
|------------|-----------|
| Runtime | Electron 44 |
| UI | React + TypeScript |
| Database | SQLite (`better-sqlite3`) |
| Packaging | Electron Forge |
| Test | Vitest + Playwright |

---

## Dati

Il database SQLite viene creato automaticamente alla prima esecuzione:

| Sistema | Percorso |
|---------|----------|
| macOS | `~/Library/Application Support/No Budget/finance.db` |
| Linux | `~/.config/No Budget/finance.db` |
| Windows | `%APPDATA%\No Budget\finance.db` |

---

## Dev setup

Requisiti: [Node.js](https://nodejs.org) (LTS), Git.

```bash
git clone https://github.com/tizianocappai/finance-journal.git
cd finance-journal/electron
npm install
npm run dev
```

### Test

```bash
# Unit test (Vitest)
npm test

# E2E test (Playwright)
npm run test:e2e
```

### Build locale

```bash
npm run make
```

Gli artefatti vengono generati in `electron/out/make/`.

---

## Stato del progetto

In sviluppo attivo. Funzionalità core stabili (movimenti, dashboard, import CSV). Roadmap: sezione Casa.
