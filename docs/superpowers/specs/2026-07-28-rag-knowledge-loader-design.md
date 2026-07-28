# rag knowledge loader — design

## Cél

Ez az 1. rész egy 3 részes RAG feature-ből (2. rész: `search-knowledge` tool az
agenteknek; 3. rész: HyDE/rerank/grounding rétegek a tool-on belül — ezek
külön specet kapnak, ha ez a rész kész).

Új `src/rag/` alá kerülő, `npm`-ből indítható script, ami feltölti a Postgres
`knowledge` táblát a `rulebooks/*.txt` (Markdown formátumú) szabálykönyvek
darabjaiból (chunk) és azok embeddingjeiből. Minden futáskor előbb törli a
tábla tartalmát, majd újratölti.

## Architektúra

- **Postgres image csere**: `postgres:16-alpine` → `pgvector/pgvector:pg16`
  (`devops/postgres/docker-compose.yml`), hogy legyen natív `vector` típus és
  cosine-távolság index.
- **Két új init SQL fájl** (csak üres data volume-nál fut le — meglévő
  konténerhez `docker compose down -v && up -d` vagy kézi `psql` kell):
  - `devops/postgres/postgres-init/04-init-knowledge.sql` — `CREATE EXTENSION
    vector`, `knowledge` tábla, HNSW cosine index. A `boardgame_ro` a meglévő
    `ALTER DEFAULT PRIVILEGES` miatt automatikusan SELECT-et kap rá (ez kell a
    2. részhez).
  - `devops/postgres/postgres-init/05-rag-role.sql` — új `boardgame_rag` role,
    kizárólag SELECT/INSERT/DELETE a `knowledge` táblán, semmi hozzáférés a
    `games`-hez, nincs DDL-je.
- **`src/rag/`** — új fogalom-könyvtár, a meglévő `src/agents` / `src/tools`
  szervezést követve: minden alkotóelem saját fájlban, közös típusok eggyel
  kintebb.

## Séma

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge (
  id serial PRIMARY KEY,
  file_name text NOT NULL,
  start_line integer NOT NULL,
  end_line integer NOT NULL,
  chunk_text text NOT NULL,
  chunking_strategy text NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX knowledge_embedding_idx ON knowledge USING hnsw (embedding vector_cosine_ops);
```

```sql
CREATE ROLE boardgame_rag WITH LOGIN PASSWORD 'boardgame_rag_dev_only';
GRANT CONNECT ON DATABASE boardgame TO boardgame_rag;
GRANT USAGE ON SCHEMA public TO boardgame_rag;
GRANT SELECT, INSERT, DELETE ON knowledge TO boardgame_rag;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO boardgame_rag;
```

## Komponensek (`src/rag/`)

- **`rag-pool.ts`** — DB pool a `boardgame_rag` role-lal (`DATABASE_URL_RAG`
  env var), a meglévő `write-pool.ts` / `read-only-pool.ts` mintáját követve.
- **`embedding/openai-client.ts`** — OpenAI kliens wrapper (`OPENAI_API_KEY`),
  az `anthropic-client.ts` mintájára (lazy singleton, fail-fast hiányzó
  kulcsra).
- **`embedding/embed-chunks.ts`** + spec — `text-embedding-3-small` hívás
  (1536 dimenzió, alapértelmezett), egy híváson belül több chunk szövegét
  embedeli; visszaadja a vektorokat és a válasz `usage.total_tokens` értékét.
- **`chunking/chunk.ts`** — közös típus: `Chunk = { fileName: string;
  startLine: number; endLine: number; text: string }` és `ChunkingResult =
  { chunks: Chunk[]; tokensUsed: number }`.
- **`chunking/fixed-size-chunking.ts`** + spec — sorokat gyűjt egy célméretig
  (`TARGET_CHUNK_CHARS = 1500`), 3 soros átfedéssel (`OVERLAP_LINES = 3`) a
  következő chunk elején. Nincs LLM-hívás → `tokensUsed: 0`.
- **`chunking/llm-semantic-chunking.ts`** + spec — a teljes, sorszámozott
  szöveget elküldi `claude-haiku-4-5`-nek `output_config.format` structured
  output-tal (JSON séma: `{ sections: [{ startLine, endLine }] }`), a
  szemantikus szakaszhatárok alapján vágja ki a chunkokat az eredeti
  szövegből. `tokensUsed` = a válasz `usage.input_tokens + usage.output_tokens`.
- **`load-knowledge/load-knowledge.ts`** + spec — fő orchestrátor: egy
  `CHUNK_STRATEGY: 'fixed-size' | 'llm-semantic'` konstans dönti el, melyik
  stratégia fusson; törli a `knowledge` tábla tartalmát; végigmegy a
  `rulebooks/*.txt` fájlokon: beolvasás → chunkolás → embedding → beszúrás;
  fájlonként logolja a chunk-számot és a felhasznált tokeneket (chunking +
  embedding, konzolra).
- **`load-knowledge/main.ts`** — CLI belépési pont: dotenv betöltés,
  `getAnthropicClient()` + OpenAI kliens + `getRagPool()` létrehozása
  (fail-fast hiányzó env varra), majd `load-knowledge.ts` meghívása.

## Adatfolyam

1. `main.ts`: `.env` betöltés, kliensek/pool létrehozása.
2. `load-knowledge.ts`: `DELETE FROM knowledge`.
3. Fájlonként (`rulebooks/*.txt`, szekvenciálisan): beolvasás → a
   `CHUNK_STRATEGY` szerinti stratégia lefuttatása → az összes chunk
   embedelése → `INSERT INTO knowledge (file_name, start_line, end_line,
   chunk_text, chunking_strategy, embedding) VALUES (...)` soronként.
4. Konzol log fájlonként: `<fájlnév>: N chunk, ~X token (chunking), ~Y token
   (embedding)`.
5. A végén összegzés: hány fájl, összesen hány chunk, összesen hány token.

## Hibakezelés

- Indításkor fail-fast: hiányzó `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` vagy
  `DATABASE_URL_RAG` → azonnali, beszédes hiba, nem-nulla exit code.
- Fájlonkénti try/catch (mint a `rule-book-converter`-nél): egy hibás fájl
  logolva lesz, de nem állítja meg a többi feldolgozását.

## Csomagolás / indítás

Új `package.json` script:

```json
"load-knowledge": "tsx src/rag/load-knowledge/main.ts"
```

Indítás: `npm run load-knowledge` (nincs argumentum — mindig a repo-gyökér
`rulebooks/` mappát dolgozza fel).

Új dependency: `openai` (hivatalos SDK az embedding híváshoz).

## Tesztelés

- `fixed-size-chunking.spec.ts` — determinisztikus bemenetre helyes
  `startLine`/`endLine` tartományok, átfedés, `tokensUsed: 0`.
- `llm-semantic-chunking.spec.ts` — Anthropic klienst mockolva (a meglévő
  `agent-loop.spec.ts` fake-stream mintája), ellenőrzi a structured output
  kérést és a `tokensUsed` számítást.
- `embed-chunks.spec.ts` — OpenAI klienst mockolva, ellenőrzi a hívás
  paramétereit és a visszaadott vektorok/`tokensUsed` alakját.
- `load-knowledge.spec.ts` — pool + kliensek mockolva, ellenőrzi a törlés →
  chunkolás → embedding → beszúrás sorrendet és hogy egy fájl hibája nem
  állítja meg a többit.
