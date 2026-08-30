# ADR 0001 — SQLite come unico storage

**Stato**: Accettato

## Contesto

L'app è offline-only e non espone dati a servizi esterni. I dati devono essere persistiti localmente in un formato portabile tra dispositivi e sistemi operativi diversi (macOS, Linux, Windows).

## Decisione

Usare un singolo file SQLite come unico storage. Il path del file è risolto da `app.getPath('userData')` di Electron per garantire il percorso cross-platform corretto su ciascun OS.

## Alternative considerate

- **JSON**: leggibile a occhio, ma lento per query aggregate (necessarie per la dashboard) e soggetto a corruzione in caso di scrittura interrotta.
- **CSV**: semplicissimo, ma inadatto a relazioni tra entità (movimenti, categorie, metodi) e query aggregate.

## Conseguenze

- Il file `.db` è l'unico artefatto da backuppare o trasferire tra dispositivi.
- Le Impostazioni espongono una funzione Export/Import del file DB per la portabilità cross-device.
- Le query aggregate per la dashboard (somme per mese, per categoria) sono native in SQL senza codice applicativo aggiuntivo.
