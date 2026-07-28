# search-knowledge tool — design

## Cél

Ez a 2. rész a 3 részes RAG feature-ből (1. rész: `src/rag` betöltő script,
kész; 3. rész: HyDE/rerank/grounding rétegek — külön spec, ha ez kész).

Egy `search_knowledge` Anthropic tool, amit a `query-agent` tud használni,
amikor a felhasználó egy társasjáték **szabályairól** kérdez. Szemantikus
(embedding-alapú) keresést végez az 1. részben feltöltött `knowledge` táblán.

## Architektúra

- `src/tools/search-knowledge/` — új tool-könyvtár, a `run-sql`/`upsert-product`
  mintáját követve.
- **Nincs új DB role.** A `boardgame_ro` (read-only pool, amit a `run_sql` is
  használ) már automatikusan SELECT-et kap a `knowledge` táblán (1. rész
  `ALTER DEFAULT PRIVILEGES` miatt) — a tool ugyanazt a pool-t kapja meg.
- `src/rag/embedding/embedding-model.ts` — kiemelt `EMBEDDING_MODEL` konstans,
  hogy az `embed-chunks.ts` és az új `embed-query.ts` ne duplikálja.
- `src/rag/embedding/embed-query.ts` + spec — egyetlen szöveg (a felhasználói
  kérdés) embedelése, nem chunk-lista.

## Komponensek

- `src/tools/search-knowledge/search-knowledge-input.ts` — Zod séma:
  `{ query: string }`.
- `src/tools/search-knowledge/search-knowledge-tool.ts` + spec —
  `searchKnowledgeTool: Anthropic.Tool` definíció + `executeSearchKnowledge`:
  1. `embedQuery(input.query)` az OpenAI klienssel.
  2. `SELECT file_name, start_line, end_line, chunk_text FROM knowledge
     ORDER BY embedding <=> $1 LIMIT 5` (pgvector cosine távolság, a meglévő
     HNSW indexet használva).
  3. Visszaadja a találatokat `{ fileName, startLine, endLine, text }[]`
     alakban.
  - A tool leírása explicit jelzi: szabály-kérdésekhez való, nem
    ár/készlet-kérdésekhez (arra a `run_sql` való).

## Bekötés a query-agentbe

- `query-agent.ts`: a `tools` tömbbe bekerül a `searchKnowledgeTool` is
  (ugyanaz a `pool`, mint a `run_sql`-nél), plusz egy opcionális
  `openAiClient?: OpenAI` mező a `QueryAgentDeps`-hez.
- `query-agent-prompt.ts`: a `<rules>` szekcióban a "BGG-értékelést / a
  katalógusban nem szereplő játékról... nem tudod lekérdezni" mondat
  pontosodik (a szabály-kérdés kivétel lesz belőle), és a `<tools>` szekció
  kiegészül a `search_knowledge` leírásával.
- Következmény: mivel a query-agent mostantól OpenAI-t is hívhat (a tool-on
  keresztül), a cli/web futtatásához `OPENAI_API_KEY` is kell — hiányzó kulcs
  esetén a hiba a tool-hívás pillanatában dobódik, a meglévő általános
  hibakezelésbe fut (nem blokkoló változás, csak megjegyzés).

## Tesztelés

- `embed-query.spec.ts` — OpenAI klienst mockolva.
- `search-knowledge-tool.spec.ts` — OpenAI + pool mockolva: ellenőrzi az
  embed-hívást, az SQL lekérdezést (`<=>`, `LIMIT 5`, a vektor paraméter) és a
  visszaadott alakot.
- `query-agent.spec.ts` frissítése: a meglévő teszt, ami a `tools` tömböt
  `[run_sql]`-re ellenőrzi, kiegészül a `search_knowledge`-dzsel is.
