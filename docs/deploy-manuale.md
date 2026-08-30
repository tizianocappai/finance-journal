# Guida: Deploy manuale delle release su GitHub

Questa guida descrive come pubblicare manualmente una release dell'app **No Budget** su GitHub, rendendo i pacchetti scaricabili dalla pagina [GitHub Releases](https://github.com/tizianocappai/finance-journal/releases).

La release è **manuale**: gli artefatti vengono generati sulla tua macchina e caricati con `gh`. È il processo più semplice quando il progetto non ha ancora un workflow GitHub Actions.

## Panoramica

```
npm run make  →  out/make/  →  gh release create  →  Release su GitHub
```

## Prerequisiti

- [Node.js](https://nodejs.org) LTS (18+)
- Interfaccia a riga di comando GitHub [`gh`](https://cli.github.com) autenticata:

  ```bash
  gh auth status
  ```

- Repo remoto configurato (`git remote -v` mostra `origin`).
- Icone di packaging presenti in `electron/assets/icons/` (`icon.icns`, `icon.ico`, `icon_256x256.png`).

## Procedura

### 1. Aggiorna la versione

La versione è definita in `electron/package.json`:

```json
"version": "0.1.0"
```

Incrementala prima di ogni release, ad esempio `0.1.1` per bugfix o `0.2.0` per funzioni nuove. Il tag della release (passo 4) deve corrispondere.

### 2. Genera gli artefatti

```bash
cd electron
npm run make
```

Gli artefatti vengono prodotti in `out/make/`. Ogni maker genera solo per la piattaforma corrente:

| Piattaforma di build | Artefatto |
|----------------------|-----------|
| macOS                | `No Budget.dmg` |
| Windows              | `NoBudgetSetup.exe` |
| Linux                | `.deb` e `.rpm` |

Verifica l'output:

```bash
ls -lh out/make/
```

> **Attenzione**: l'app deve essere ricompilata **sulla stessa piattaforma** di destinazione. Il `.dmg` generato su macOS è utilizzabile solo su macOS perché incluse le dependency native (es. `better-sqlite3`).

### 3. Commit e push del codice

```bash
cd ..
git add -A
git commit -m "Release v0.1.0"
git push origin main
```

Se la versione è cambiata al passo 1, il commit deve includere `electron/package.json` (e `electron/package-lock.json`).

### 4. Crea il tag

```bash
git tag v0.1.0
git push origin v0.1.0
```

Il nome del tag segue la convenzione `v<version>`: `v0.1.0` per `0.1.0`.

### 5. Crea la release e allega gli artefatti

Dalla directory `electron/` (dove si trovano gli artefatti):

```bash
gh release create v0.1.0 \
  --title "No Budget v0.1.0" \
  --notes "Descrizione delle novità di questa release." \
  "out/make/No Budget.dmg"
```

Se hai più artefatti, elencali tutti:

```bash
gh release create v0.1.0 \
  --title "No Budget v0.1.0" \
  --notes "Descrizione delle novità di questa release." \
  "out/make/No Budget.dmg" "out/make/NoBudgetSetup.exe"
```

Comandi utili per gestire una release già esistente:

```bash
# Allega artefatti a una release esistente
gh release upload v0.1.0 "out/make/No Budget.dmg"

# Elenco release
gh release list

# Modifica note di una release
gh release edit v0.1.0 --notes "Nuove note."
```

> Le note possono essere scritte in un file Markdown: `--notes-file CHANGELOG.md`.

### 6. Verifica

- Leggi l'URL della release dall'output del comando precedente.
- Apri `https://github.com/tizianocappai/finance-journal/releases` e controlla che gli asset siano presenti e scaricabili.
- Scarica e installa il pacchetto seguendo le istruzioni in [`INSTALL.md`](../INSTALL.md).

## Risoluzione problemi

| Problema | Causa probabile | Soluzione |
|----------|-----------------|-----------|
| `gh release create` fallisce | Il tag esiste già su GitHub | Usa `gh release create v0.1.0` senza il tag, oppure `gh release upload`. |
| Il `.dmg` non si apre su altra Mac | L'app non è notarizzata | Clic destro → Apri oppure `xattr -cr /Applications/"No Budget.app"` (vedi INSTALL.md). |
| `better-sqlite3` non si carica nell'app | Dipendenze native incoerenti | Esegui `npm install` pulito dentro `electron/` prima di `npm run make`. |
| Artefatto per OS diverso manca | Maker per piattaforma | Ogni maker genera solo per la piattaforma corrente; è previsto (vedi nota al passo 2). |

## Prossimo passo consigliato

Il deploy manuale richiede che gli artefatti vengano generati per ogni piattaforma sui rispettivi OS. Un workflow **GitHub Actions** esegue `npm run make` su macOS/Windows/Linux in parallelo e pubblica tutto automaticamente al push del tag: se la guida manuale ha raggiunto lo scopo, quella è l'automazione naturale successiva.