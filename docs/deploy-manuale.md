# Guida: Release su GitHub

Questa guida descrive come pubblicare una release dell'app **No Budget** su GitHub.

## Modo rapido: usa il wizard

```bash
./scripts/release.sh
```

Lo script guida passo dopo passo: aggiorna la versione, committa, pusha il tag e apre le pagine giuste al momento giusto. Il workflow CI (`release.yml`) costruisce automaticamente gli artefatti per macOS, Windows e Linux.

**Prerequisiti:** `gh` autenticato, `pnpm`, `node`, `git remote` configurato.

---

## Panoramica del flusso

```
bump version in package.json
  → git commit + push main
    → git tag vX.Y.Z + push
      → CI: test → draft release → build (3 piattaforme) → upload artefatti
        → pubblica la release draft su GitHub
```

## Procedura manuale passo per passo

### 1. Aggiorna la versione

La versione è definita in `electron/package.json`:

```json
"version": "0.2.0"
```

Convenzione semver: `X.Y.Z+1` per bugfix, `X.Y+1.0` per feature, `X+1.0.0` per breaking change.

### 2. Commit e push del version bump

```bash
git add electron/package.json
git commit -m "chore: bump version to 0.3.0"
git push origin main
```

### 3. Crea e pusha il tag

```bash
git tag v0.3.0
git push origin v0.3.0
```

Il push del tag avvia automaticamente il workflow `.github/workflows/release.yml` che:
1. Esegue i test
2. Crea una release in bozza su GitHub
3. Builda gli artefatti su macOS, Windows e Linux con `pnpm exec electron-forge make`
4. Allega i file `.dmg`, `.exe`, `.deb`, `.rpm` alla release

### 4. Monitora il workflow

```bash
gh run list --limit 5
```

Oppure apri `https://github.com/tizianocappai/finance-journal/actions`.

### 5. Pubblica la release draft

Quando il workflow è completato, la release è ancora in bozza. Pubblicala con:

```bash
gh release edit v0.3.0 \
  --draft=false \
  --title "No Budget v0.3.0" \
  --notes "Descrizione delle novità."
```

Oppure dal browser: GitHub → Releases → clicca l'icona matita → aggiungi note → **Publish release**.

### 6. Verifica

```bash
gh release view v0.3.0
```

- Controlla che gli artefatti siano presenti per tutte le piattaforme.
- Scarica e installa il pacchetto seguendo le istruzioni in [`INSTALL.md`](../INSTALL.md).

## Risoluzione problemi

| Problema | Causa probabile | Soluzione |
|----------|-----------------|-----------|
| Il workflow fallisce al job `test` | Test rotti | Correggi i test, elimina il tag (`git tag -d vX.Y.Z && git push origin :vX.Y.Z`) e ripusha. |
| `gh release edit` fallisce | Release non esiste ancora | Attendi il completamento del job `create-draft` nel workflow. |
| Il `.dmg` non si apre su altra Mac | App non notarizzata | Clic destro → Apri oppure `xattr -cr /Applications/"No Budget.app"` (vedi INSTALL.md). |
| `better-sqlite3` non si carica | Dipendenze native incoerenti | Esegui `pnpm install` pulito dentro `electron/` prima di `pnpm run make`. |