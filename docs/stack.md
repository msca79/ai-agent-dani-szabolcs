# Boardgame — tech stack

Elv: iparági best practice, legfrissebb STABIL verzió (se cutting-edge, se elavult).

- Nyelv / monorepo: TypeScript (strict), Nx, pnpm, Node LTS
- DB: PostgreSQL lokálisan docker-compose-ban (OrbStack futtatja), Prisma (ORM: séma, migráció, seed, typed query). Helyben dolgozunk, nincs felhő-DB.
- Agent: Anthropic SDK (hivatalos kliens, nem nyers HTTP) + saját tool-use loop, agent-framework nélkül. Zod (validáció)
- Külső integráció: MCP-kliens a BoardGameGeek API-hoz (valós értékelés, komplexitás, játékosszám-ajánlás)
- CLI: commander + node:readline
- Tooling: Vitest, ESLint + Prettier, tsx
- Eszköz: Zed, gh CLI

## games séma

```sql
games (
  id                    serial primary key,
  name                  text,        -- játék neve
  bgg_id                int,         -- BoardGameGeek azonosító (a BGG MCP-hívásokhoz)
  category              text,        -- parti / stratégiai / család / kooperatív / kártya / absztrakt / dobókockás / roguelike
  complexity            text,        -- könnyű / közepes / nehéz
  players_min           int,
  players_max           int,
  playtime_min_minutes  int,
  playtime_max_minutes  int,
  min_age               int,
  price                 numeric,     -- ár (HUF)
  sale_price            numeric,     -- akciós ár (ha van akció), különben null
  stock                 int,         -- raktárkészlet (db)
  rating                numeric,     -- 0-10
  reviews_count         int,
  description           text
)
```

### Értékkészletek (kategorikus mezők)

- **category:** parti, stratégiai, család, kooperatív, kártya, absztrakt, dobókockás, roguelike
- **complexity:** könnyű, közepes, nehéz
