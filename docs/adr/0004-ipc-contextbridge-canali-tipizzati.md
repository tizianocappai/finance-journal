# ADR 0004 — IPC con contextBridge e canali tipizzati flat

**Stato**: Accettato

## Contesto

In Electron il renderer non ha accesso diretto a Node.js. La comunicazione tra renderer e main process avviene via IPC. La scelta dell'architettura IPC determina sicurezza, tipizzazione e manutenibilità.

## Decisione

Usare `contextBridge` + preload script con canali tipizzati flat. Ogni operazione è un canale con nome strutturato (`dominio:azione`, es. `movimenti:list`, `movimenti:create`). Il tipo di request e response di ogni canale è definito in un file TypeScript condiviso tra main e preload.

`nodeIntegration` rimane disabilitato (default Electron sicuro).

## Alternative considerate

- **nodeIntegration abilitato**: accesso Node diretto nel renderer. Semplice ma insicuro: un XSS nel renderer compromette il filesystem.
- **tRPC over IPC**: procedure TypeScript tipizzate end-to-end. Elegante, ma setup complesso (schema router, adapters) non giustificato per questa dimensione di app.
- **REST via localhost**: HTTP tra main e renderer. Overhead non necessario per una app locale.

## Conseguenze

- Il contratto IPC è esplicito e tipizzato: errori di tipo tra main e renderer vengono catturati a compile time.
- Aggiungere un'operazione richiede: (1) definire il tipo nel contratto, (2) registrare il handler nel main, (3) esporre via preload.
- `contextBridge` limita l'API esposta al renderer: solo le funzioni esplicitamente whitelistate sono accessibili.
