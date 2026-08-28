# Finance Journal — Glossario di dominio

## Entità principali

**Movimento**
Unità atomica di registrazione finanziaria. Ogni movimento appartiene a una Sezione e ha: data, tipo, importo (sempre positivo), categoria, metodo di pagamento, nota (opzionale).

**Entrata**
Movimento con tipo=Entrata. Contribuisce positivamente al Saldo del periodo.

**Uscita**
Movimento con tipo=Uscita. Contribuisce negativamente al Saldo del periodo.

**Dettaglio**
Sotto-classificazione operativa di un Movimento. Descrive la natura specifica del Movimento (es. "Supermercato", "Bolletta luce"). Ogni Dettaglio è associato a esattamente una Categoria. Può essere predefinito o custom. Un Movimento ha zero o un Dettaglio (nullable: i Movimenti storici ne sono privi). La Categoria del Movimento è derivata dal Dettaglio associato, ma può essere sovrascritta una tantum per quel singolo Movimento.

**Categoria**
Classificazione semantica di un Movimento. È universale: si applica indifferentemente a Entrate e Uscite. Può essere predefinita (parte del set di default) o custom (aggiunta dall'utente). Un Movimento ha esattamente una Categoria. Quando il Movimento ha un Dettaglio, la Categoria è normalmente derivata da esso; può essere sovrascritta one-off senza modificare l'associazione globale Dettaglio→Categoria.

**Metodo di Pagamento**
Strumento usato per eseguire un Movimento (es. Contanti, Carta di credito). Può essere predefinito o custom. Un Movimento ha esattamente un Metodo di Pagamento.

**Saldo**
Differenza algebrica tra totale Entrate e totale Uscite in un periodo. Il Saldo può essere calcolato su un mese, un anno, o dall'inizio del Saldo Iniziale.

**Saldo Iniziale**
Valore dichiarato dall'utente come punto di partenza contabile, associato a una data. Non è un Movimento: non appare nella lista movimenti e non ha categoria né metodo di pagamento. È opzionale.

**Mese in Rosso**
Mese in cui il totale Uscite supera il totale Entrate (saldo mensile negativo).

## Struttura dell'app — Electron

**Main Process**
Processo Node.js con accesso completo al filesystem e alle API native di Electron. Gestisce: accesso al DB (via `better-sqlite3`), operazioni su file (export CSV/JSON, import DB), path utente, lifecycle dell'app. Non ha accesso al DOM.

**Renderer Process**
Processo browser (Chromium) che esegue l'interfaccia React. Non ha accesso diretto al filesystem né a Node. Comunica con il Main Process esclusivamente tramite l'IPC Bridge.

**IPC Bridge**
Strato di comunicazione tra Renderer e Main Process. Esposto nel renderer via `contextBridge` (preload script). Organizzato in canali tipizzati flat (es. `movimenti:list`, `movimenti:create`). Il tipo di ogni canale è definito in un contratto TypeScript condiviso tra main e preload.

## Struttura dell'app

**Sezione**
Area funzionale dell'app che raggruppa un insieme coerente di Movimenti. Le sezioni previste sono Personale e Casa. Ogni Sezione ha il proprio insieme di Movimenti ma condivide lo stesso database.

**Contesto Personale**
Sezione che traccia le finanze dell'individuo. Prima sezione implementata.

**Contesto Casa**
Sezione che traccia le finanze domestiche condivise. Implementazione futura, stesso DB.

**Anno Finanziario**
Anno solare (1 gennaio – 31 dicembre) usato come granularità principale per Dashboard e navigazione.

**Dashboard**
Vista aggregata di un Anno Finanziario per una Sezione. Mostra: KPI sintetici (totale Entrate, totale Uscite, Saldo annuale, numero di Mesi in Rosso), andamento mensile entrate/uscite, breakdown uscite per Categoria, confronto con l'anno precedente.

## Distribuzione e packaging

**Nome app distribuita**: No Budget
**Bundle identifier**: `app.nobudget`
**Build tool**: Electron Forge + Vite plugin — cross-platform; produce `.app`+`.dmg` su macOS, `.exe` su Windows, AppImage su Linux.
**Firma**: nessuna per ora. Gli utenti macOS devono fare clic destro → Apri → Apri comunque (workaround Gatekeeper documentato in INSTALL.md).
**Icona**: simbolo `€` bianco su sfondo verde scuro `#1B5E20`.
**Distribuzione**: GitHub Releases — artefatti caricati manualmente a ogni release.
**DB path**: `app.getPath('userData')` di Electron — equivalente cross-platform di `platformdirs`; stesso percorso OS dell'app Python.

## Regole di dominio

- L'importo di un Movimento è sempre un numero positivo. Il Tipo (Entrata/Uscita) ne determina il segno ai fini del calcolo del Saldo.
- Eliminare una Categoria in uso richiede conferma esplicita; i Movimenti associati vengono riassegnati alla categoria "Altro".
- Eliminare un Dettaglio imposta `dettaglio_id = NULL` sui Movimenti che lo referenziano; la Categoria di quei Movimenti rimane invariata.
- I Dettagli predefiniti non possono essere eliminati (analogo alle Categorie predefinite).
- La stessa regola vale per i Metodi di Pagamento custom eliminati.
- Il Saldo Iniziale, se presente, viene sommato al Saldo calcolato dai Movimenti a partire dalla sua data.
