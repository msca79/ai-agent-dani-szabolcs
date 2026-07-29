#!/usr/bin/env bash
# parse-goldet-set-token.sh
#
# A run-golden-set.sh által készített JSONL eseménynaplókból kiszedi a
# token-használatot kérdésenként és szakaszonként (hyde / rerank / grounding /
# válasz-generálás), külön a "full" (teljes pipeline) és a "raw" (nyers
# vektorkeresés) futásra, és egy összefoglaló Markdown riportba írja.
#
# Használat:
#   ./parse-goldet-set-token.sh [időbélyeg]
#   pl.: ./parse-goldet-set-token.sh 20260729-140431
# Argumentum nélkül a 20260729-140431 mappára fut.
#
# Előfeltétel: jq telepítve, és a golden-set-runs/<időbélyeg>/ mappa a
# run-golden-set.sh kimenetét tartalmazza (NN-full.jsonl, NN-raw.jsonl,
# questions.txt).

set -uo pipefail

TIMESTAMP="${1:-20260729-140431}"
DIR="golden-set-runs/$TIMESTAMP"
OUT="$DIR/$TIMESTAMP.report.md"
QUESTIONS_FILE="$DIR/questions.txt"

if [[ ! -d "$DIR" ]]; then
  echo "Nincs ilyen mappa: $DIR" >&2
  exit 1
fi

# Egy esemény-típus adott mezőjének összegét adja vissza egy jsonl fájlból
# (hiányzó mező vagy nulla találat esetén 0-t).
sum_field() {
  local file="$1" event="$2" field="$3"
  if [[ ! -f "$file" ]]; then
    echo 0
    return
  fi
  jq -s --arg ev "$event" --arg f "$field" \
    '[ .[] | select(.event == $ev) | (.[$f] // 0) ] | add // 0' \
    "$file"
}

question_text() {
  local n="$1"
  if [[ -f "$QUESTIONS_FILE" ]]; then
    grep "^$n:" "$QUESTIONS_FILE" | sed "s/^$n: //"
  fi
}

{
  echo "# Golden set — token-használat riport ($TIMESTAMP)"
  echo
  echo "Forrás: \`$DIR/\`"
  echo
  echo "## Összesítő táblázat"
  echo
  echo "| # | Kérdés | full összesen | full: hyde | full: rerank | full: grounding | full: válasz (in/out) | raw összesen | raw: grounding | raw: válasz (in/out) |"
  echo "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|"

  total_full=0
  total_raw=0
  total_hyde=0
  total_rerank=0
  total_grounding_full=0
  total_grounding_raw=0
  total_answer_full_in=0
  total_answer_full_out=0
  total_answer_raw_in=0
  total_answer_raw_out=0

  detail=""

  for full_file in "$DIR"/*-full.jsonl; do
    [[ -e "$full_file" ]] || continue
    n=$(basename "$full_file" | cut -d- -f1)
    raw_file="$DIR/$n-raw.jsonl"
    question=$(question_text "$n")

    hyde=$(sum_field "$full_file" rag_hyde tokensUsed)
    rerank=$(sum_field "$full_file" rag_rerank tokensUsed)
    grounding_full=$(sum_field "$full_file" rag_grounding tokensUsed)
    answer_full_in=$(sum_field "$full_file" llm_response inputTokens)
    answer_full_out=$(sum_field "$full_file" llm_response outputTokens)
    answer_full=$((answer_full_in + answer_full_out))
    full_total=$((hyde + rerank + grounding_full + answer_full))

    grounding_raw=$(sum_field "$raw_file" rag_grounding tokensUsed)
    answer_raw_in=$(sum_field "$raw_file" llm_response inputTokens)
    answer_raw_out=$(sum_field "$raw_file" llm_response outputTokens)
    answer_raw=$((answer_raw_in + answer_raw_out))
    raw_total=$((grounding_raw + answer_raw))

    echo "| $n | $question | $full_total | $hyde | $rerank | $grounding_full | ${answer_full} (${answer_full_in}/${answer_full_out}) | $raw_total | $grounding_raw | ${answer_raw} (${answer_raw_in}/${answer_raw_out}) |"

    detail+=$'\n'"### $n — $question"$'\n\n'
    detail+="- **full** — összesen: **$full_total** token"$'\n'
    detail+="  - hyde: $hyde"$'\n'
    detail+="  - rerank: $rerank"$'\n'
    detail+="  - grounding: $grounding_full"$'\n'
    detail+="  - válasz-generálás: $answer_full (input: $answer_full_in, output: $answer_full_out)"$'\n'
    detail+="- **raw** — összesen: **$raw_total** token"$'\n'
    detail+="  - grounding: $grounding_raw"$'\n'
    detail+="  - válasz-generálás: $answer_raw (input: $answer_raw_in, output: $answer_raw_out)"$'\n'

    total_full=$((total_full + full_total))
    total_raw=$((total_raw + raw_total))
    total_hyde=$((total_hyde + hyde))
    total_rerank=$((total_rerank + rerank))
    total_grounding_full=$((total_grounding_full + grounding_full))
    total_grounding_raw=$((total_grounding_raw + grounding_raw))
    total_answer_full_in=$((total_answer_full_in + answer_full_in))
    total_answer_full_out=$((total_answer_full_out + answer_full_out))
    total_answer_raw_in=$((total_answer_raw_in + answer_raw_in))
    total_answer_raw_out=$((total_answer_raw_out + answer_raw_out))
  done

  total_answer_full=$((total_answer_full_in + total_answer_full_out))
  total_answer_raw=$((total_answer_raw_in + total_answer_raw_out))

  echo "| **Σ** |  | **$total_full** | **$total_hyde** | **$total_rerank** | **$total_grounding_full** | **$total_answer_full** (${total_answer_full_in}/${total_answer_full_out}) | **$total_raw** | **$total_grounding_raw** | **$total_answer_raw** (${total_answer_raw_in}/${total_answer_raw_out}) |"

  echo
  echo "## Kérdésenkénti bontás"
  echo "$detail"

  echo "## Összesen (5 kérdés)"
  echo
  echo "**full pipeline:** $total_full token"
  echo "  - hyde: $total_hyde"
  echo "  - rerank: $total_rerank"
  echo "  - grounding: $total_grounding_full"
  echo "  - válasz-generálás: $total_answer_full (input: $total_answer_full_in, output: $total_answer_full_out)"
  echo
  echo "**raw (nyers vektorkeresés):** $total_raw token"
  echo "  - grounding: $total_grounding_raw"
  echo "  - válasz-generálás: $total_answer_raw (input: $total_answer_raw_in, output: $total_answer_raw_out)"
  echo
  diff=$((total_full - total_raw))
  echo "**Különbség (full − raw):** $diff token — a HyDE + rerank réteg többletköltsége."
  echo
  echo "> Az embedding-hívások (a search_knowledge tool query-embeddingje) tokenjei itt NEM"
  echo "> szerepelnek — azt külön, az OpenAI oldalon követed."
} > "$OUT"

echo "Riport kész: $OUT"
