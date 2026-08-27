# Finance Journal — Glossario di dominio

## Entità principali

**Movimento**
Unità atomica di registrazione finanziaria. Ogni movimento appartiene a una Sezione e ha: data, tipo, importo (sempre positivo), categoria, metodo di pagamento, nota (opzionale).

**Entrata**
Movimento con tipo=Entrata. Contribuisce positivamente al Saldo del periodo.

**Uscita**
Movimento con tipo=Uscita. Contribuisce negativamente al Saldo del periodo.

**Categoria**
Classificazione semantica di un Movimento. È universale: si applica indifferentemente a Entrate e Uscite. Può essere predefinita (parte del set di default) o custom (aggiunta dall'utente). Un Movimento ha esattamente una Categoria.

**Metodo di Pagamento**
Strumento usato per eseguire un Movimento (es. Contanti, Carta di credito). Può essere predefinito o custom. Un Movimento ha esattamente un Metodo di Pagamento.

**Saldo**
Differenza algebrica tra totale Entrate e totale Uscite in un periodo. Il Saldo può essere calcolato su un mese, un anno, o dall'inizio del Saldo Iniziale.

**Saldo Iniziale**
Valore dichiarato dall'utente come punto di partenza contabile, associato a una data. Non è un Movimento: non appare nella lista movimenti e non ha categoria né metodo di pagamento. È opzionale.

**Mese in Rosso**
Mese in cui il totale Uscite supera il totale Entrate (saldo mensile negativo).

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

## Regole di dominio

- L'importo di un Movimento è sempre un numero positivo. Il Tipo (Entrata/Uscita) ne determina il segno ai fini del calcolo del Saldo.
- Eliminare una Categoria in uso richiede conferma esplicita; i Movimenti associati vengono riassegnati alla categoria "Altro".
- La stessa regola vale per i Metodi di Pagamento custom eliminati.
- Il Saldo Iniziale, se presente, viene sommato al Saldo calcolato dai Movimenti a partire dalla sua data.
