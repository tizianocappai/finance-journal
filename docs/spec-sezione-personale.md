# Spec — Sezione Personale MVP Finance Journal

> Label da applicare su GitHub Issues: `ready-for-agent`

## Problem Statement

Gestire le proprie finanze personali richiede oggi di affidarsi a fogli di calcolo dispersi, app cloud che inviano i dati a server esterni, o carta e penna. Non esiste uno strumento desktop semplice, offline-first, che permetta di registrare entrate e uscite per categoria e giorno, e di avere immediatamente una visione chiara della situazione finanziaria annuale — senza dipendere da connessione internet o servizi di terze parti.

## Solution

Finance Journal è un'applicazione desktop Electron che salva tutti i dati in locale su un file SQLite. La sezione **Personale** offre:

- Una **Dashboard** con KPI annuali, andamento mensile, breakdown per categoria e confronto con l'anno precedente
- Una **Lista Movimenti** con filtri avanzati e inserimento/modifica/eliminazione tramite dialog modale
- Una sezione **Impostazioni** per configurare valuta, saldo iniziale, categorie e metodi di pagamento custom, tema e portabilità del database

L'app funziona completamente offline e non espone alcun dato a servizi esterni.

## User Stories

### Dashboard

1. Come utente, voglio vedere il totale delle Entrate dell'anno corrente in evidenza, così da sapere subito quanto ho guadagnato.
2. Come utente, voglio vedere il totale delle Uscite dell'anno corrente in evidenza, così da sapere subito quanto ho speso.
3. Come utente, voglio vedere il Saldo netto annuale (Entrate − Uscite + Saldo Iniziale), così da capire la mia posizione finanziaria complessiva.
4. Come utente, voglio vedere quanti mesi dell'anno sono stati "in rosso" (Uscite > Entrate), così da identificare i periodi critici.
5. Come utente, voglio un grafico a barre mensile che mostri Entrate e Uscite affiancate per ogni mese, così da vedere l'andamento nel tempo.
6. Come utente, voglio un grafico donut che mostri le Uscite ripartite per Categoria, così da capire dove spendo di più.
7. Come utente, voglio un grafico che confronti l'andamento dell'anno corrente con quello dell'anno precedente, così da valutare se sto migliorando.
8. Come utente, voglio navigare tra anni diversi con frecce ← → nella dashboard, così da consultare la situazione finanziaria di anni passati.
9. Come utente, voglio che la dashboard si aggiorni automaticamente ogni volta che aggiungo, modifico o elimino un Movimento.

### Lista Movimenti

10. Come utente, voglio vedere la lista dei Movimenti del mese corrente per default, così da avere subito il contesto rilevante.
11. Come utente, voglio filtrare i Movimenti per mese e anno, così da consultare periodi specifici.
12. Come utente, voglio filtrare i Movimenti per tipo (Entrata / Uscita / Tutti), così da separare rapidamente le due direzioni.
13. Come utente, voglio filtrare i Movimenti per Categoria, così da analizzare una categoria specifica.
14. Come utente, voglio filtrare i Movimenti per Metodo di Pagamento, così da verificare le spese su una carta o in contanti.
15. Come utente, voglio cercare i Movimenti per testo libero sulla descrizione/nota, così da ritrovare un movimento specifico.
16. Come utente, voglio aggiungere un nuovo Movimento tramite un dialog modale, così da non perdere il contesto della lista.
17. Come utente, voglio che il dialog di inserimento abbia come data di default quella odierna, così da non doverla digitare ogni volta.
18. Come utente, voglio modificare un Movimento esistente con un doppio click sulla riga, così da correggere errori senza ricrearlo.
19. Come utente, voglio eliminare un Movimento con un pulsante dedicato nel dialog di modifica, così da rimuovere registrazioni errate.
20. Come utente, voglio una conferma esplicita prima dell'eliminazione di un Movimento, così da evitare cancellazioni accidentali.
21. Come utente, voglio che l'importo sia sempre positivo e il tipo (Entrata/Uscita) determini il segno, così da non confondermi con valori negativi.

### Dialog Movimento (inserimento e modifica)

22. Come utente, voglio selezionare la Categoria da un dropdown, così da mantenere la classificazione coerente.
23. Come utente, voglio aggiungere una nuova Categoria direttamente dal dropdown ("Nuova categoria…"), così da non interrompere il flusso di inserimento.
24. Come utente, voglio selezionare il Metodo di Pagamento da un dropdown, così da tracciare lo strumento usato.
25. Come utente, voglio aggiungere un nuovo Metodo di Pagamento direttamente dal dropdown ("Nuovo metodo…"), così da non interrompere il flusso.
26. Come utente, voglio inserire una nota/descrizione libera opzionale, così da aggiungere contesto al Movimento.

### Impostazioni

27. Come utente, voglio vedere il percorso del file DB nelle Impostazioni, così da sapere dove si trovano i miei dati.
28. Come utente, voglio esportare il file DB da un pulsante nelle Impostazioni, così da portarlo su un altro dispositivo.
29. Come utente, voglio importare un file DB da un pulsante nelle Impostazioni, così da ripristinare i dati da un altro dispositivo.
30. Come utente, voglio gestire le Categorie custom (aggiunta e rimozione) nelle Impostazioni, così da mantenere la lista ordinata.
31. Come utente, voglio gestire i Metodi di Pagamento custom nelle Impostazioni, così da adattarli alle mie abitudini.
32. Come utente, voglio che l'eliminazione di una Categoria in uso mi chieda conferma con il numero di Movimenti impattati, così da non perdere classificazioni involontariamente.
33. Come utente, voglio che i Movimenti di una Categoria eliminata vengano riassegnati ad "Altro", così da non avere dati orfani.
34. Come utente, voglio configurare la valuta (simbolo e codice) nelle Impostazioni, così da usare l'app con qualsiasi valuta.
35. Come utente, voglio impostare un Saldo Iniziale opzionale con data di riferimento, così da avere un saldo corretto anche senza aver inserito tutta la storia.
36. Come utente, voglio scegliere il tema (chiaro / scuro / segui sistema) nelle Impostazioni, così da adattare l'app alle mie preferenze visive.

### Export

37. Come utente, voglio esportare i Movimenti in CSV dal menu File → Esporta, così da aprirli in Excel o Numbers.
38. Come utente, voglio esportare i Movimenti in JSON dal menu File → Esporta, così da avere un backup strutturato.

## Implementation Decisions

### Architettura generale

- **Framework GUI**: Electron 44 + React + TypeScript
- **Grafici**: Recharts (o libreria React compatibile)
- **Database**: SQLite via `better-sqlite3`, un singolo file per tutta l'app (Personale + Casa futura su tabelle separate)
- **Path cross-platform**: `app.getPath('userData')` di Electron — Linux: `~/.config/`, macOS: `~/Library/Application Support/`, Windows: `%APPDATA%/`
- **Tema**: segue il sistema operativo di default, override manuale nelle Impostazioni

### Navigazione

Sidebar verticale con voci: **Personale** (sotto-voci: Dashboard, Movimenti), **Casa** (futura), **Impostazioni**

### Schema dati (SQLite)

Entità principali da modellare:

- `movimenti`: id, data, tipo (entrata|uscita), importo (REAL, sempre positivo), categoria_id, metodo_id, nota, sezione (personale|casa), created_at
- `categorie`: id, nome, predefinita (BOOLEAN), sezione
- `metodi_pagamento`: id, nome, predefinito (BOOLEAN)
- `impostazioni`: chiave, valore (key-value store per valuta, saldo_iniziale, saldo_iniziale_data, tema)

### Aggregation layer

Le funzioni di aggregazione per la dashboard sono **pure functions** che ricevono una lista di `Movimento` e restituiscono strutture dati calcolate (KPI dict, lista mensile, lista categorie). Non accedono al DB direttamente.

### Categorie default (universali, per Entrate e Uscite)

`Stipendio`, `Freelance`, `Spesa`, `Bollette`, `Trasporti`, `Salute`, `Svago`, `Altro`

### Metodi di pagamento default

`Contanti`, `Carta di debito`, `Carta di credito`, `Bonifico`, `Altro`

### Regole di dominio

- L'importo è sempre positivo; il tipo `entrata|uscita` ne determina il segno ai fini del saldo
- Il Saldo Iniziale (se presente) si somma al saldo calcolato a partire dalla sua data
- Eliminare una Categoria in uso richiede conferma; i Movimenti associati vengono riassegnati ad `Altro`
- La stessa regola vale per i Metodi di Pagamento custom eliminati

## Testing Decisions

### Cosa rende un buon test

Testare il **comportamento osservabile** (dati persistiti, query restituite, aggregati calcolati) non l'implementazione interna. Non fare mock del DB: usare SQLite in-memory (`:memory:`) per avere test reali e veloci.

### Seam 1 — Repository layer

Testare ogni operazione del Repository contro un DB SQLite in-memory con Vitest:

- `MovimentoRepository`: creazione, lettura, aggiornamento, eliminazione, filtro per periodo/tipo/categoria/metodo, ricerca per testo
- `CategoriaRepository`: CRUD, eliminazione con riassegnazione a "Altro", distinzione predefinite/custom
- `MetodoPagamentoRepository`: CRUD, stessa logica di eliminazione
- `ImpostazioniRepository`: lettura e scrittura di ogni chiave di configurazione

### Seam 2 — Aggregation functions

Testare le funzioni di aggregazione dashboard come pure functions (Vitest):

- Calcolo KPI annuali (totale entrate, totale uscite, saldo, mesi in rosso) su fixture di Movimenti
- Breakdown mensile corretto anche con mesi senza Movimenti
- Breakdown per categoria con Movimenti multi-categoria
- Calcolo corretto del Saldo Iniziale sommato al saldo dei Movimenti

### Fuori scope dai test automatici

La UI React, i grafici e la navigazione visiva non vengono testati con Vitest. I flussi principali possono essere coperti da test Playwright (`npm run test:e2e`).

## Out of Scope

- **Sezione Casa**: architettura predisposta (stessa tabella `movimenti` con campo `sezione`), ma nessuna UI implementata
- **Movimenti ricorrenti automatici**: rimandati alla seconda fase
- **Import di dati storici** (CSV/JSON): rimandato alla seconda fase; l'export è in scope
- **Multi-utente / sincronizzazione cloud**: fuori scope per design (app offline-first)
- **Grafici interattivi** (zoom, tooltip avanzati): la dashboard è read-only e statica
- **Notifiche / alerting**: nessun sistema di avvisi o promemoria

## Further Notes

- Il file SQLite è l'unico artefatto da backuppare. Le Impostazioni espongono Export/Import del file DB come meccanismo primario di portabilità cross-device.
- La valuta è configurabile (simbolo + codice) ma l'app non fa conversioni: tutti gli importi sono nella valuta configurata.
- Il glossario di dominio è in `CONTEXT.md` alla radice del repo; le decisioni architetturali sono in `docs/adr/`.
- ADR di riferimento: `docs/adr/0001-sqlite-come-unico-storage.md`
