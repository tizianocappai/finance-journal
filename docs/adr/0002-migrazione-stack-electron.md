# ADR 0002 — Migrazione stack da PyQt6 a Electron

**Stato**: Accettato

## Contesto

L'app è scritta in Python + PyQt6. Il packaging cross-platform con Briefcase è risultato fragile e la distribuzione su macOS richiede workaround per Gatekeeper. L'obiettivo è una riscrittura da zero che mantenga feature parity ma migliori l'esperienza di sviluppo, il packaging e l'ecosistema UI.

## Decisione

Migrare a Electron (main process Node.js + renderer React + TypeScript). Stack completo:
- **Electron Forge + Vite plugin** per build e packaging
- **React + TypeScript** per il renderer
- **shadcn/ui (Default) + Tailwind v4** per componenti e stile
- **AG Grid Community + AG Charts** per tabelle e grafici
- **Zustand** per state management nel renderer
- **better-sqlite3** per accesso DB nel main process
- **pnpm** come package manager

Il progetto vive in `electron/` nello stesso repo Python fino a raggiungimento della feature parity + packaging; poi il progetto Python viene rimosso.

## Alternative considerate

- **Continuare con PyQt6**: packaging su macOS rimane problematico; ecosistema UI più limitato.
- **Tauri (Rust + WebView)**: bundle più piccolo, ma Rust aggiunge complessità di sviluppo e l'ecosistema è meno maturo di Electron.
- **NW.js**: meno diffuso di Electron, community più piccola, meno risorse.

## Conseguenze

- Il file SQLite esistente rimane compatibile: stesso schema, stesso path OS (vedi ADR 0003).
- L'app Python è congelata: nessun nuovo sviluppo sulla versione PyQt6 durante la migrazione.
- Dimensione bundle Electron (~100 MB) è maggiore di PyQt6, accettato per i benefici in packaging e DX.
