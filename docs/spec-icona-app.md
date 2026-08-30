# Spec: Icona applicazione Electron ("No Budget")

## Objective

Integrare l'icona dell'app "No Budget" (generata con IconKitchen) nella configurazione Electron Forge per tutte e tre le piattaforme di packaging: macOS, Windows, Linux.

L'utente è lo sviluppatore dell'app. Il successo si misura quando l'eseguibile prodotto da `npm run make` mostra l'icona corretta nel dock/taskbar/launcher di ciascuna piattaforma.

## Tech Stack

- Electron Forge con plugin Vite
- TypeScript (`forge.config.ts`)
- ImageMagick (`magick` CLI) per generare `icon.ico` multi-size da PNG
- Sorgente icone: `/Users/tiziano.cappai/Downloads/IconKitchen-Output-2/`

## Commands

```bash
# Dalla directory electron/
cd electron

# Build e packaging (verifica icona)
npm run make

# Dev (non include icona nel dock durante sviluppo, ma avvia l'app)
npm run start

# Genera icon.ico multi-size (da eseguire una volta)
magick \
  /Users/tiziano.cappai/Downloads/IconKitchen-Output-2/macos/AppIcon16.png \
  /Users/tiziano.cappai/Downloads/IconKitchen-Output-2/macos/AppIcon32.png \
  /Users/tiziano.cappai/Downloads/IconKitchen-Output-2/macos/AppIcon64.png \
  /Users/tiziano.cappai/Downloads/IconKitchen-Output-2/macos/AppIcon128.png \
  /Users/tiziano.cappai/Downloads/IconKitchen-Output-2/macos/AppIcon256.png \
  electron/assets/icons/icon.ico
```

## Project Structure

```
electron/
├── assets/
│   └── icons/           ← NEW: directory icone
│       ├── icon.icns    ← macOS (copiato da IconKitchen macos/AppIcon.icns)
│       ├── icon.ico     ← Windows (generato da ImageMagick, multi-size)
│       └── icon.png     ← Linux (copiato da IconKitchen web/icon-512.png)
├── forge.config.ts      ← MODIFICATO: aggiunto packagerConfig.icon
└── src/
```

## Code Style

Modifica minimale a `forge.config.ts` — aggiungere solo il campo `icon` in `packagerConfig`:

```typescript
packagerConfig: {
  asar: true,
  icon: 'assets/icons/icon',   // senza estensione: Forge aggiunge .icns/.ico/.png per piattaforma
},
```

Nessun import aggiuntivo necessario: il percorso relativo è risolto dalla directory di lavoro `electron/` al momento del packaging.

## Testing Strategy

Nessun test automatizzato applicabile (asset statici + config).

Verifica manuale:
1. `npm run make` completa senza errori
2. L'app impacchettata mostra l'icona corretta su macOS (`.icns` 183 KB)
3. I file `icon.ico` e `icon.png` esistono e hanno dimensioni ragionevoli

## Boundaries

- **Always:** Verificare che `npm run make` passi dopo la modifica
- **Ask first:** Modificare dimensioni o source dei PNG sorgente
- **Never:** Committare file binari da `node_modules` o output di build

## Success Criteria

- [ ] `electron/assets/icons/icon.icns` esiste (copia di `AppIcon.icns`, ~183 KB)
- [ ] `electron/assets/icons/icon.ico` esiste, generato con ImageMagick da 5 PNG (16/32/64/128/256px)
- [ ] `electron/assets/icons/icon.png` esiste (copia di `icon-512.png`, 512px)
- [ ] `forge.config.ts` ha `packagerConfig.icon: 'assets/icons/icon'`
- [ ] `npm run make` completa senza errori (su macOS)

## Open Questions

Nessuna.
