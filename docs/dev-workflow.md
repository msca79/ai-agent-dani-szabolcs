# Boardgame — fejlesztői workflow + automatizmus

> Konkrét git-szabályok, hook-konfigurációk, dokumentációs folyamat. Ezt is átadjuk a Claude Code-nak.

## Git

### Branching

- `main`: mindig zöld, deploy-olható. Közvetlenül main-re NEM commitolunk.
- Feature branch: `feat/<rövid-leírás>` (pl. `feat/search-games-tool`). Egyéb prefixek: `fix/`, `refactor/`, `docs/`, `chore/`.

### Commit (Conventional Commits)

Formátum: `<típus>: <leírás>`. Típusok: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`.
Példák: `feat: add search-games tool`, `test: cover recommend-bundle budget guard`.

### Auto-commit

Minden befejezett, koherens lépés után kicsi, fókuszált commit (egy lépés = egy commit). Lásd a `Stop` hookot.

## Hookok (`settings.json`)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm prettier --write $FILE",
            "timeout": 10000,
            "async": true
          },
          {
            "type": "command",
            "command": "pnpm vitest related --run $FILE",
            "timeout": 60000,
            "async": true
          }
        ]
      }
    ]
  }
}
```

- **prettier** (PostToolUse, Edit): formázás szerkesztés után.
- **teszt** (PostToolUse, Edit): a változáshoz tartozó Vitest fut.

FONTOS: a hookok a **Claude Code (L1) akcióit** fogják meg (amit Claude szerkeszt/futtat), NEM a termék futásidejű lekérdezéseit. A termék read-only védelme a **DB-kapcsolat (read-only role)**, nem hook, mert a belső tool-ok a termék kódja, nem Claude Code tool.

## /docs (a repóban)

```
docs/
├── ddd/
│   ├── glossary.md        ubiquitous language (játék, kategória, nehézség, játékosszám, játékidő...)
│   └── model.md           entitások, value objectek, aggregátumok
└── tech/
    ├── infra.md           Postgres (OrbStack docker-compose), .env, a két DB-kapcsolat
    ├── architecture.md    core/apps, adat-elérés, read-only vs Prisma, belső tool vs MCP
    └── api.md              tool/CLI felület (ask, belső tool-ok, MCP-integráció)
```

## Dokumentáció-frissítés

A `/docs` frissítését a **`ddd-audit` skill** végzi (git-history → docs), külön, igény szerint futtatva.
