# Boardgame — Üzleti követelmény-leírás (BRS)

> A build brief, amelyet 1:1 átadunk a Claude Code-nak a projekt elején. A technikai részleteket külön dokumentumok tartalmazzák: `stack.md`, `architektura.md`, `konvenciok.md`, `dev-workflow.md`.

## 1. Üzleti igény / probléma

A társasjáték-bolt eladója (a persona) sok időt tölt azzal, hogy az ügyfél igényei (játékosszám, rendelkezésre álló idő, nehézségi szint, korosztály, büdzsé) és a játékkatalógus alapján megtalálja a megfelelő társasjátékot vagy ajándékot.

Hol megy el az idő (a kézi munka java):

- katalógus böngészése, keresgélés kategória és nehézség szerint;
- játékosszám és játékidő egyeztetése az ügyfél igényeivel;
- raktárkészlet-ellenőrzés;
- akciók figyelése;
- belefér-e a büdzsébe;
- hasonló vagy kapcsolódó játékok keresése ("ha ez tetszett, ez is").

Példa ügyfélkérdések:

- "3-an játszanánk maximum 30 percet valami könnyen tanulható parti játékot."
- "3-an játszanánk valami új stratégiai, pár órás játékkal, amit még nem ismerünk."
- "Keresek ajándékot egy 10 éves gyereknek, max 8000 Ft."

Az adat megvan, de a kinyerése aprómunka, és SQL-tudást vagy elemzőt igényelne. Ez lassítja az ügyfél-ajánlat összeállítását.

### ROI / mérőszámok

**Hard (forintosítható):**

- Időmegtakarítás: egy ügyfél-ajánlat kézi összeállítása jelenleg 10-15 perc; az agenttel **KPI: egy ajánlat < 5 perc**.
- Jobb ár-érték: az agent figyeli az akciókat, és megtalálja ugyanazt olcsóbban vagy jobb alternatívát → alacsonyabb beszerzési vagy vételi költség az ügyfélnek.

**Soft (valós, de nehezen forintosítható):**

- Magasabb ügyfélélmény (gyorsabb, pontosabb ajánlat).
- Jobb minőségű munka (jobb illeszkedés az ügyfél igényeihez: létszám, idő, nehézség, korosztály).

**Bővítési képesség (későbbi):** korábbi ajánlások/vásárlások elemzése → jobb javaslat; közösségi funkciók (baráti kör meghívása, RSVP-gyűjtés); játékszabály-lekérés. Ehhez ajánlás-történet tárolása kell; a v1 csak a katalógus felett dolgozik.

## 2. Megoldás

`boardgame`: parancssori (CLI) AI agent, amely a természetes nyelvű kérdést a társasjáték-katalógus (`games`) feletti keresésre és ajánlásra fordítja, belső tool-okon és külső integráción (MCP) keresztül fut, és természetes nyelvű választ ad. Önkiszolgáló ajánlórendszer szakértői tudás nélkül.

## 3. Hatókör (scope, v1)

Benne (v1):

- A `games` katalógus feletti természetes nyelvű kérdés-válasz és ajánlás.
- Read-only adat-elérés.
- CLI felület: `ask` parancs + interaktív mód.
- Belső tool-ok: `search_games`, `similar_games`, `recommend_bundle`, `compare_games`, `get_stock`.
- Külső integráció (MCP): BoardGameGeek API — valós értékelés, komplexitás, játékosszám-ajánlás a katalógus-adat hitelesítéséhez/kiegészítéséhez.

Kívül (későbbi):

- Rendelés/bevétel adat, írás vagy módosítás.
- Web és voice felület.
- Több felhasználó, jogosultságkezelés.
- YouTube API (játékmenet-videók linkelése).
- Használt termék keresés (Vinted / marketplace) — paraméterezett URL összeállítása.
- Játékszabály API (PDF, több nyelven).
- Discord/Slack MCP — baráti kör meghívása, RSVP-gyűjtés ("ki ér rá szombaton?").

## 4. Követelmények

### Funkcionális (FR)

- **FR1, Kérdezés:** `boardgame ask "<kérdés>"` egyszeri lekérdezés, és interaktív readline mód (amíg `exit`).
- **FR2, NL → tool-hívás:** az agent az LLM-mel eldönti, mely belső tool-t (`search_games`, `similar_games`, `recommend_bundle`, `compare_games`, `get_stock`) és/vagy külső MCP-t (BoardGameGeek) hívja; több lépéses (multistep) loop a végleges válaszig.
- **FR3, Válasz:** a lekérdezés eredményéből természetes nyelvű választ ad, kiemelve a döntéshez fontos attribútumokat.
- **FR4, Naplózás:** minden interakciót logol (`logs/<timestamp>.jsonl`): system prompt, üzenetek, tool-hívások és eredményük, válasz, token-felhasználás.
- **FR5, Átláthatóság:** `--show-prompt` mód, amely kiírja a teljes üzenet-tömböt.

### Nem-funkcionális (NFR)

- **NFR1, Biztonság:** az agent read-only adatbázis-kapcsolaton fut, csak SELECT.
- **NFR2, Átláthatóság:** a működés naplóból és `--show-prompt`-ból követhető.
- **NFR3, Karbantarthatóság:** a `konvenciok.md` és `architektura.md` betartása.
- **NFR4, Reprodukálhatóság:** a projekt a `stack.md` szerinti, legfrissebb stabil eszközökkel felépíthető.

## 5. Sikerkritériumok

- A felhasználó természetes nyelven kérdez a katalógusról, és helyes, érthető ajánlást kap szakértői tudás nélkül.
- Demo-kritérium: élő kérdés → helyes tool-hívás(ok) → helyes válasz.
- Az agent soha nem módosítja az adatot (csak SELECT, read-only kapcsolat).
- Minden interakció naplózva; a működés `--show-prompt`-tal átlátható.
- **Hatékonyság (KPI):** egy ügyfél-ajánlat vagy játékcsomag 5 perc alatt összeállítható (a korábbi 10-15 perc helyett).

## 6. Adat

A `games` (társasjáték-katalógus) tábla a domain. A pontos séma a `stack.md`-ben. Szintetikus seed, valós játékcímekkel és reális attribútumokkal (játékosszám, játékidő, nehézség, korosztály, ár, készlet).
