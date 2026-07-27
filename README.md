# ai-agent-dani-szabolcs

## Getting started

Előfeltétel: Node.js LTS (>=22), és egy olyan shell, ahol a `docker compose` működik
(Windows PowerShell, vagy WSL Docker Desktop integrációval bekapcsolva — lásd lent).

1. Függőségek telepítése:

   ```
   npm install
   ```

2. Környezeti változók:

   ```
   cp .env.example .env
   ```

   Töltsd ki az `ANTHROPIC_API_KEY`-t; a `DATABASE_URL_READONLY` alapértéke a helyi
   docker-compose Postgres-hez illeszkedik, nem kell módosítani.

3. Postgres indítása (a `games` séma és a seed-adat automatikusan betöltődik első indításkor):

   ```
   make pg
   ```

   > **WSL megjegyzés:** ha a `docker` parancs nem található a WSL disztródban, kapcsold be a
   > Docker Desktop WSL-integrációt erre a disztróra (Docker Desktop → Settings → Resources →
   > WSL Integration), majd indítsd újra a shellt.

4. Indítás — válassz, melyik felületet szeretnéd:

   ```
   make cli   # interaktív parancssoros ügynök
   make web   # Vite chat UI, http://localhost:5173
   ```

### Ellenőrzés

```
npm test
npm run lint
npm run typecheck
psql "$DATABASE_URL_READONLY" -c "select count(*) from games;"
```
