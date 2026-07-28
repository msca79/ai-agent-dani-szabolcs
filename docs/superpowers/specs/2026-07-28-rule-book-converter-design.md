# rule-book-converter — design

## Cél

Új app `src/apps/rule-book-converter` alatt, ami egy megadott mappában megkeresi
a képeket is tartalmazó társasjáték-szabálykönyv PDF-eket, amelyeknek még nincs
azonos nevű `.txt` párja, és egyenként átalakítja őket RAG-optimált, hiánytalan
szöveges (Markdown) dokumentummá egy Claude vision-hívás segítségével. A
kimenetet a PDF mellé menti `<pdf-alapnév>.txt` néven.

## Architektúra

Önálló CLI script, ami a meglévő `src/apps/cli` mintáját követi (dotenv
betöltés, majd egyszerű `main.ts` belépési pont). **Nem** használja az
`agents/agent-loop`-ot: az a tool-use ciklusokra épül, itt viszont nincs
tool-hívás — egyetlen kérés/válasz Claude-dal, natív PDF `document` content
blokkal. Az API-hívás mintája (`client.messages.stream(...).finalMessage()`,
`stop_reason` ellenőrzés) az `agent-loop.ts`-ben már bevált mintát követi.

A meglévő `agents/client/anthropic-client.ts` wrappert használja az
API-kulcshoz (`getAnthropicClient()`).

## Komponensek (`src/apps/rule-book-converter/`)

- **`main.ts`** — belépési pont. `process.argv[2]`-ből olvassa a mappa
  útvonalát, dotenv-et tölt be, meghívja `getAnthropicClient()`-et egyszer
  (fail-fast, ha hiányzik a kulcs), majd a scan+convert logikát. Minden
  fájlhoz try/catch: egy hibás PDF nem állítja meg a többi feldolgozását. A
  végén összegzést ír (hány sikeres, hány hibás).
- **`find-pending-pdfs.ts`** + spec — megadott mappában megkeresi azokat a
  `*.pdf` fájlokat, amelyeknek nincs azonos alapnevű `*.txt` párja mellettük
  (kis-nagybetű független kiterjesztés-egyezés).
- **`convert-rulebook.ts`** + spec — egy PDF-et base64-re olvas, elküldi
  Claude-nak (`claude-sonnet-5`) egy `document` content blokkal (natív PDF
  support, nincs külön kép-konvertálás) + a `rulebook-prompt.ts` promptjával.
  Streaming hívás (`max_tokens: 64000`), hogy hosszú kimenetnél se legyen
  HTTP timeout. `stop_reason === 'refusal'` esetén beszédes hibát dob.
  Visszaadja az összefűzött szöveg content blockokat.
- **`rulebook-prompt.ts`** — a promptsablon konstansként, XML-szerű tagekkel
  (`<role>`, `<rules>`) a `docs/konvenciok.md` ajánlása szerint. A cím
  azonosítását a dokumentum tartalmából várja el, nem a fájlnévből.

## Adatfolyam

1. `main.ts` megkapja a mappa útvonalát CLI argumentumból, `getAnthropicClient()`
   egyszer lefut (fail-fast API-kulcs hiányra).
2. `findPendingRulebookPdfs` felsorolja a feldolgozandó PDF-eket.
3. Fájlonként **szekvenciálisan** (rate limit + átlátható logolás miatt):
   `convertRulebookPdf` → `.txt` kiírás ugyanabban a mappában → konzol log.
4. Egy fájl hibája logolva lesz (stderr), de nem állítja meg a batch többi
   részét.

## Hibakezelés

- Indításkor fail-fast: hiányzó `ANTHROPIC_API_KEY` vagy hiányzó/érvénytelen
  mappa argumentum → azonnali, beszédes hiba, nem-nulla exit code.
- Fájlonként try/catch: `stop_reason: "refusal"`, olvasási/írási hiba,
  API-hiba — mind elkapva, `error instanceof Error` szűkítéssel, logolva,
  a batch folytatódik.

## Csomagolás / indítás

Új `package.json` script:

```json
"convert-rulebooks": "tsx src/apps/rule-book-converter/main.ts"
```

Indítás: `npm run convert-rulebooks -- ./docs/rulebooks`

## Tesztelés

- `find-pending-pdfs.spec.ts` — valós ideiglenes mappával (`fs.mkdtemp`):
  vegyes eset (van/nincs txt pár, más kiterjesztések, kis/nagybetű).
- `convert-rulebook.spec.ts` — az `agent-loop.spec.ts`-ben már bevált
  `FakeStream`/fake-client mintát követve mockolja az Anthropic klienst:
  ellenőrzi, hogy a hívás tartalmaz egy `document` content blokkot base64 PDF
  adattal + a prompt szöveges blokkját; hogy a szöveg content blockok
  összefűzve jönnek vissza; és hogy `stop_reason: "refusal"` esetén hibát dob.
- `main.ts` vékony wiring, nem kap külön unit tesztet (ahogy a meglévő
  `cli/main.ts` sem).

## Prompt (rulebook-prompt.ts tartalma)

```xml
<role>
Egy pontos, RAG-optimált dokumentum-feldolgozó asszisztens vagy. Feladatod egy
társasjáték-szabálykönyv PDF-jét (amely képeket, ábrákat is tartalmaz) teljes,
hiánytalan, jól strukturált Markdown dokumentummá alakítani, amit vektor-
adatbázisba (RAG) lehet tölteni.
</role>

<rules>
- A dokumentum címét (a játék nevét) magából a PDF tartalmából azonosítsd — ne
  a fájlnévből találd ki. Minden fő fejezet kontextusában szerepeljen ez a cím.
- A PDF-ben található ÖSSZES képet, ábrát, illusztrációt, ikonográfiai elemet
  és vizuális jelölést részletesen írd le és alakítsd át szöveges
  információvá. Ha egy ábrán pl. az látszik, melyik mezőre hova épülhet
  valami, vagy nyilak/számok vannak rajta, az ábra pontos tartalmát külön
  szakaszban magyarázd el: [ÁBRA MAGYARÁZAT: ...].
- Ne hagyj ki semmilyen szabályt, apróbetűs részt vagy széljegyzetet — a
  hiánytalanság elsődleges szempont.
- Használj világos Markdown fejezetcímeket (#, ##, ###). A listákat és
  táblázatokat tiszta szöveges formátumban tartsd meg.
- A kimenet nyelve pontosan egyezzen meg a dokumentum eredeti nyelvével.
- Csak a kész Markdown dokumentumot add vissza, bevezető vagy záró kommentár
  nélkül.
</rules>
```
