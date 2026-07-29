#!/usr/bin/env bash
# run-golden-set.sh
#
# 5 kérdéses golden set a boardgame RAG keresési pipeline-hoz. Minden kérdést
# KÉTFÉLEKÉPPEN futtat le:
#   - "full"  — teljes pipeline (HyDE + rerank bekapcsolva, az alapértelmezett)
#   - "raw"   — nyers vektorkeresés (HyDE és rerank kikapcsolva HYDE_ENABLED=false
#               / RERANK_ENABLED=false env-változóval, lásd
#               src/tools/search-knowledge/hyde.ts és rerank.ts)
#
# Kérdésenként elmenti a végső választ (stdout) ÉS a teljes eseménynaplót
# (stderr, JSONL — lásd src/agents/agent-loop/agent-logger.ts), hogy utólag,
# LLM-hívás nélkül vissza lehessen nézni:
#   - a search_knowledge tool candidateOrder / rerankedOrder mezőit
#     (rag_rerank esemény) — ezen látszik, ha a rerank átrendezte a sorrendet
#   - a végső válasz-generálás és a HyDE/rerank/grounding réteg token-használatát
#     (llm_response / rag_hyde / rag_rerank / rag_grounding események)
#
# Előfeltétel:
#   - `make pg` fut, és a tudásbázis be van töltve (`npm run load-knowledge`)
#   - `.env` tartalmazza az ANTHROPIC_API_KEY + OPENAI_API_KEY kulcsokat
#   - `jq` telepítve (a script végi gyors-ellenőrzéshez)
#
# Minden futtatás valódi API-hívás — költséggel jár, ezért tudatosan, egyszer
# futtasd, ne próbálgatva.

set -uo pipefail

QUESTIONS=(
  "Hogyan kell pontozni a leghosszabb kereskedelmi utat a Catanban?"
  "Mi történik, ha a Hanabiban hibásan dobok el egy lapot?"
  "Hány pontot ér egy félkész kolostor a Carcassonne végén?"
  "Hogyan kell felállítani a szereplőket az első kör elején a Colt Expressben?"
  "Hogyan kell pontozni a Dixitben, ha mindenki kitalálja a mesélő kártyáját?"
)
# Az 5. kérdés SZÁNDÉKOSAN negatív teszt: a Dixit szabálykönyve nincs a
# rulebooks/ mappában (csak Catan, Hanabi, Carcassonne, Colt Express stb. van
# betöltve a tudásbázisba) — ezen mérhető, hogy a grounding-réteg kimondja-e a
# forráshiányt, ahelyett hogy kitalálna egy választ.

OUTDIR="golden-set-runs/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTDIR"

manifest="$OUTDIR/questions.txt"
: > "$manifest"

for i in "${!QUESTIONS[@]}"; do
  n=$(printf "%02d" $((i + 1)))
  question="${QUESTIONS[$i]}"
  echo "$n: $question" >> "$manifest"

  echo "[$n/05] teljes pipeline (HyDE + rerank)      — $question"
  npm run cli -- ask "$question" \
    > "$OUTDIR/$n-full.txt" \
    2> "$OUTDIR/$n-full.jsonl"

  echo "[$n/05] nyers vektorkeresés (HyDE+rerank ki) — $question"
  HYDE_ENABLED=false RERANK_ENABLED=false npm run cli -- ask "$question" \
    > "$OUTDIR/$n-raw.txt" \
    2> "$OUTDIR/$n-raw.jsonl"
done

echo
echo "Kész. Kimenet: $OUTDIR"
echo
echo "Rerank-átrendezés gyors ellenőrzése kérdésenként (candidateOrder = nyers vektor-sorrend, rerankedOrder = rerank utáni sorrend):"
for i in "${!QUESTIONS[@]}"; do
  n=$(printf "%02d" $((i + 1)))
  echo "--- $n: ${QUESTIONS[$i]} ---"
  jq -c 'select(.event == "rag_rerank") | {candidateOrder, rerankedOrder}' "$OUTDIR/$n-full.jsonl"
done
