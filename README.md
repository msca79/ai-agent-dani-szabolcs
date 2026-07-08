# ai-agent-dani-szabolcs

## Getting started

Előfeltétel: Node LTS, pnpm (`corepack enable pnpm`), és egy olyan shell, ahol a `docker compose`
működik (Windows PowerShell, vagy WSL Docker Desktop integrációval bekapcsolva — lásd lent).

1. Függőségek telepítése:

   ```
   pnpm install
   ```

2. Környezeti változók:

   ```
   cp .env.example .env
   ```

   Töltsd ki az `ANTHROPIC_API_KEY`-t; a `DATABASE_URL` / `DATABASE_URL_READONLY` alapértékei
   a helyi docker-compose Postgres-hez illeszkednek, nem kell módosítani.

3. Postgres indítása:

   ```
   docker compose up -d
   ```

   > **WSL megjegyzés:** ha a `docker` parancs nem található a WSL disztródban, kapcsold be a
   > Docker Desktop WSL-integrációt erre a disztróra (Docker Desktop → Settings → Resources →
   > WSL Integration), majd indítsd újra a shellt.

4. Séma migrálása és seed betöltése:

   ```
   pnpm run db:migrate
   pnpm run db:seed
   ```

5. CLI indítása:

   ```
   pnpm exec tsx apps/cli/src/main.ts --help
   ```

### Ellenőrzés

```
pnpm exec nx run-many -t test lint
psql "$DATABASE_URL_READONLY" -c "select count(*) from games;"
```
