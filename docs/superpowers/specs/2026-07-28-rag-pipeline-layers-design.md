# HyDE / rerank / grounding rétegek — design

## Cél

Ez a 3. (utolsó) rész a RAG feature-ből (1. rész: `src/rag` betöltő,
2. rész: `search_knowledge` tool — mindkettő kész). A `search_knowledge`
tool-t és a `query-agent`-et bővíti három opcionális, egyenként ki/be
kapcsolható réteggel: HyDE, rerank, grounding. Mindegyik saját fájlban,
plugin-szerűen.

**Fontos pontosítás a groundinghoz**: a "válasz-ellenőrzés" a **végső
agent-válaszra** vonatkozik, ami időben *a tool lefutása után* születik meg
(a tool csak chunk-okat ad vissza). Ezért ez a réteg nem a
`search-knowledge-tool.ts`-ben, hanem a `query-agent.ts`-ben fut, a
`runAgentLoop` visszatérése után, a beszélgetés során lekért chunk-okat
összegyűjtve.

## Architektúra

- **`src/rag/rag-llm-model.ts`** — közös `RAG_LLM_MODEL = 'claude-haiku-4-5'`
  konstans. Ezt veszi át a HyDE, a rerank, a grounding **és** a meglévő
  `llm-semantic-chunking.ts` is (utóbbi apró refaktor: a helyi `MODEL`
  konstans helyett ezt importálja) — egy helyen állítható a réteg-modell.
- **`src/tools/search-knowledge/hyde.ts`** + spec — `HYDE_ENABLED` konstans.
  Ha be van kapcsolva: egy LLM-hívás (`RAG_LLM_MODEL`) egy hipotetikus
  szabálykönyv-részletet ír a kérdésre magyar nyelven; **ezt** embedeljük a
  nyers kérdés helyett a vektor-kereséshez (a HyDE lényege: egy
  válasz-jellegű szöveg embeddingje jobban hasonlít a tárolt chunk-ok
  embeddingjéhez, mint egy rövid kérdésé).
- **`src/tools/search-knowledge/rerank.ts`** + spec — `RERANK_ENABLED`
  konstans. Ha be van kapcsolva: a vektor-keresés nem `TOP_K=5`, hanem
  `CANDIDATE_POOL_SIZE=15` jelöltet hoz vissza; egy LLM-hívás (structured
  output: a jelöltek indexei relevancia szerinti sorrendben) kiválasztja és
  sorba rendezi a legjobb 5-öt az **eredeti** kérdéshez képest (nem a
  HyDE-dokumentumhoz).
- **`src/tools/search-knowledge/grounding-check.ts`** + spec —
  `checkGrounding(question, answer, chunks, client?)`: LLM-hívás (structured
  output: `{ grounded: boolean, notes: string }`), ami megnézi, hogy a végső
  válasz tényleg a visszaadott chunk-okon alapul-e.
- **`search-knowledge-tool.ts`** bővítése: `HYDE_ENABLED`/`RERANK_ENABLED`
  alapján hívja a fenti pluginokat a keresés előtt/közben; minden rétegnél
  logolja a felhasznált tokent (`console.log`).
- **`query-agent.ts`** bővítése: `GROUNDING_ENABLED` konstans; a
  `search_knowledge` tool `execute` wrapper-e egy lokális tömbbe gyűjti a
  beszélgetés során visszaadott chunk-okat; a végső válasz után, ha volt
  találat és a kapcsoló be van kapcsolva, lefut a `checkGrounding`, a
  token-használat és a verdikt konzolra logolva. **A válasz szövegét nem
  módosítjuk** — csak figyelmeztető log, ha a válasz nem tűnik
  megalapozottnak, hogy ne bonyolítsuk túl a scope-ot.

## Adatfolyam (search_knowledge tool, mindkét réteggel bekapcsolva)

1. `HYDE_ENABLED` → hipotetikus dokumentum generálása a kérdésből (token log).
2. A keresésre használt szöveg embedelése (a HyDE-dokumentum, vagy ha HyDE ki
   van kapcsolva, a nyers kérdés).
3. Vektor-keresés a `knowledge` táblán: `RERANK_ENABLED` esetén
   `CANDIDATE_POOL_SIZE=15`, egyébként `TOP_K=5` találat.
4. `RERANK_ENABLED` → a jelöltek újrarendezése/szűkítése az **eredeti**
   kérdéshez képest a legjobb 5-re (token log).
5. A végleges chunk-lista visszaadása a tool eredményeként.

## Adatfolyam (grounding, query-agent)

1. A `search_knowledge` tool minden hívásának eredménye bekerül egy, a
   `queryAgent` hívás életciklusához kötött gyűjtő tömbbe.
2. `runAgentLoop` visszaadja a végső választ.
3. Ha `GROUNDING_ENABLED` és a gyűjtő tömb nem üres: `checkGrounding(question,
   answer, chunks)` lefut, a verdikt és a token-használat logolva
   (`console.warn`, ha `grounded: false`).
4. A függvény a `runAgentLoop` válaszát adja vissza változatlanul.

## Tesztelés

- `hyde.spec.ts`, `rerank.spec.ts`, `grounding-check.spec.ts` — Anthropic
  klienst mockolva, a bevált `messages.parse`/structured-output mintával (mint
  `llm-semantic-chunking.spec.ts`).
- `search-knowledge-tool.spec.ts` kiegészítése: teszt HyDE/rerank be- és
  kikapcsolt állapotban is.
- `query-agent.spec.ts` kiegészítése: a grounding-check meghívódik, ha volt
  `search_knowledge` találat a beszélgetésben; nem hívódik meg, ha nem volt.
