# A fejlesztői környezettől az első működő agentig

Ez a leírás végigvezet azon, hogyan állítod fel a fejlesztői környezetedet, és hogyan építed fel vele lépésről lépésre az első működő AI agentedet, a `boardgame`-et, a saját gépeden. A cél konkrét és mérhető: a végén a `boardgame ask "..."` parancs valódi, természetes nyelvű választ ad egy társasjáték-ajánlási kérdésre. Ez nem elméleti bevezető, hanem egy követhető út a nulláról a működő rendszerig.

Végig két dolgot különböztetünk meg, és érdemes fejben szétválasztani őket. Az egyik az eszköz, **amivel építünk**: a Claude Code, egy fejlesztői AI agent, amelynek természetes nyelven utasításokat adsz, ő pedig megírja a kódot, futtatja a parancsokat és teszteli a munkát. A másik a termék, **amit építünk**: a boardgame, a mi saját agentünk, ami a felhasználó kérdését a megfelelő belső tool-hívásra (keresés, ajánlás, összehasonlítás, készletlekérdezés) fordítja és megválaszolja. A leírásban mindkettő szerepel: a Claude Code-nak adott utasítások hétköznapi, természetes nyelvűek, a boardgame saját belső utasítását (a system promptját) viszont strukturáltan, XML-szerűen írjuk meg. Ez a megkülönböztetés végig fontos lesz.

## 1. Mit építünk

A `boardgame` egy parancssori (CLI) AI agent egy társasjáték-webshop katalógusa fölött. A felhasználó hétköznapi nyelven kérdez (például: „3-an játszanánk maximum 30 percet valami könnyen tanulható parti játékot" vagy „keresek ajándékot egy 10 éves gyereknek, max 8000 Ft"), az agent ezt a megfelelő belső tool-hívásra fordítja, lefuttatja a katalóguson, majd a kapott eredményből érthető, természetes nyelvű ajánlást ad. A felhasználónak nem kell ismernie a katalógus szerkezetét, mégis önkiszolgáló módon kérdezhet és kaphat ajánlást.

A kulcs, hogy az alapoktól, rétegről rétegre építjük fel, hogy minden darab működése külön-külön is látszódjon. Először egy puszta parancssori program lesz, ami csak visszhangozza, amit beírsz. Aztán bekötjük egy LLM-be, így már beszélget, de még nem fér hozzá a katalógushoz. Végül kap egy első tool-t (a `search_games` toolt), amivel valóban lekérdezi a katalógust; erre a mintára épülnek később a további tool-ok (`similar_games`, `recommend_bundle`, `compare_games`, `get_stock`) és a BoardGameGeek MCP-integráció. A végállapot az, hogy a `boardgame ask "..."` helyes választ ad egy valódi kérdésre, és te pontosan érted, mi történik az egyes rétegekben.

Fontos, hogy ez nem „vibe coding". Nem annyit mondunk Claude-nak, hogy „csinálj egy appot", aztán elfogadjuk, ami kijön. Pontos leírást (a projekt doksijait) adunk be, tervet készíttetünk a kód előtt, minden lépés után átnézzük a változást, tesztelünk és commitolunk. Te irányítasz, az AI hajt végre, az ítélet a tiéd.

## 2. A fejlesztői környezet telepítése

Mielőtt bármit építenénk, fel kell raknod néhány eszközt. A sorrend logikus: előbb a fő eszköz (Claude Code), utána a futtatókörnyezet és a csomagkezelő (Node, pnpm), végül a kiegészítők (GitHub CLI, Docker, szerkesztő). Minden lépés mind a három platformon működik. Windowson a parancsokat PowerShellben (vagy WSL-ben) futtasd; a `docker compose`, `pnpm` és `gh` szintaxisa mindenhol azonos.

1. **Claude Code** (a fő eszköz, ezzel fogunk építeni). Telepítés:
   - macOS / Linux: `curl -fsSL https://claude.ai/install.sh | bash` (macOS-en alternatíva: `brew install --cask claude-code`).
   - Windows: PowerShellben `irm https://claude.ai/install.ps1 | iex` (natív telepítés), vagy WSL-ben a macOS/Linux-út.
   - Ne npm-mel telepítsd. Az első indításkor bejelentkezel: a `claude` parancs elindításakor, vagy a session-ben a `/login` paranccsal.

2. **Node LTS** (a futtatókörnyezet, erre épül a pnpm és a TypeScript-futtatás is). Telepítés:
   - macOS: `brew install node`, vagy nvm-mel.
   - Windows: `winget install OpenJS.NodeJS.LTS`, vagy nvm-windows. (WSL alatt a Linux-utat használd.)
   - Linux: a disztró csomagkezelője helyett ajánlott az nvm (`nvm install --lts`) vagy a NodeSource LTS-csomag.

3. **pnpm** (a csomagkezelő, ne npm). A Node része a corepack, ezzel kapcsolod be minden platformon: `corepack enable pnpm` (Windowson PowerShellben vagy a Terminálban).

4. **GitHub CLI** (`gh`). A Claude minden git- és GitHub-műveletet ezen keresztül végez, ezért kell. Telepítés:
   - macOS: `brew install gh`.
   - Windows: `winget install GitHub.cli` (vagy `scoop install gh`).
   - Linux: a disztró csomagkezelőjéből (apt/dnf), vagy a hivatalos GitHub CLI repóból.
   - Mindenhol, telepítés után: jelentkezz be a `gh auth login` paranccsal.

5. **Docker** (ez futtatja a lokális Postgres adatbázist egy konténerben). Telepítés:
   - macOS: **OrbStack** (`brew install --cask orbstack`) vagy Docker Desktop.
   - Windows: **Docker Desktop** (`winget install Docker.DockerDesktop`), WSL2 backenddel. (OrbStack csak macOS-en van.)
   - Linux: Docker Engine a disztró csomagkezelőjéből.

6. **Szerkesztő.** macOS / Linux: **Zed** (`brew install --cask zed`). Windowson **VS Code** (vagy Cursor) javasolt a Zed helyett, mert a Zed elsősorban Mac-re készült.

A végén ellenőrizd, hogy minden a helyén van. Futtasd ezeket, és mindegyik adjon vissza egy verziószámot:

```
claude --version
node -v
pnpm -v
gh --version
docker --version
```

## 3. Claude Code: hozzáférés és alapbeállítások

A Claude Code fizetős eszköz, tehát szükséged lesz hozzáférésre. Három út van. A legegyszerűbb az **előfizetés** (Pro, Max, Team vagy Enterprise): bejelentkezés-alapú, fix havidíjas, ezt ajánljuk alapértelmezettként. A második az **Anthropic Console API kulcs**, ami pay-as-you-go, vagyis tokenenként fizetsz. A harmadik egy **felhős platform** (Amazon Bedrock, Google Vertex vagy Microsoft Foundry), ez inkább cégeknek való.

Ha előfizetést használsz, két korláttal érdemes számolni, amelyek egyszerre élnek. Az egyik egy gördülő, 5 órás ablak: a kereted 5 óránként újraindul, és ha beleütközöl, várnod kell a következő resetig. A másik egy heti felső keret, ami az 5 órás ablak fölött is érvényes.

Néhány alapbeállítást érdemes ismerned. A modellt a `/model` paranccsal váltod (Opus, Sonnet, Haiku), ez teljesítmény és költség közti döntés. Azt, hogy mennyit „gondolkodjon" válasz előtt, az `/effort` szabályozza. A jogosultságokat (meddig mehet jóváhagyás nélkül) a `Shift+Tab` váltogatja a futó session-ben. A `/rc` paranccsal a session-t webről vagy mobilról is irányíthatod. A tartós projekt-kontextust és szabályokat pedig a `CLAUDE.md` fájlban tartod, amit a `/init` hoz létre és a `/memory` szerkeszt. Ami tartós, azt a `settings.json`-ban is rögzítheted; ami pillanatnyi, azt menet közben slash-paranccsal vagy `Shift+Tab`-bal állítod.

A jogosultsági (permission) módokat különösen hasznos érteni, mert ezzel szabályozod, mennyire dolgozhat magától az agent:

- `default`: minden kockázatos lépésnél visszakérdez.
- `acceptEdits`: a fájlszerkesztéseket automatikusan elfogadja, de a futtatásoknál még kérdez.
- `plan`: read-only tervezés, vagyis előbb megmutatja a tervet, és nem nyúl semmihez.
- `auto` (research preview): nagyrészt magától dolgozik.
- `dontAsk`: nem kérdez vissza.
- `bypassPermissions`: minden engedélyt megkerül; ez veszélyes, csak elszigetelt konténerben használd.

Az építés során főleg a `plan` (terv a kód előtt) és az `acceptEdits` (gördülékeny építés) között fogsz váltani a `Shift+Tab`-bal. Tartós beállításként a `settings.json`-ban így néz ki: `"permissions": { "defaultMode": "acceptEdits" }`.

## 4. Pluginek és MCP-szerverek

Két módon bővíted a Claude Code képességeit. A **pluginek** kész funkciócsomagok (parancsok, skillek, workflow-k), amelyeket egy „marketplace"-ből telepítesz. Az **MCP-szerverek** külső eszközöket kötnek be (GitHub, adatbázis, naprakész dokumentáció), így az agent nem csak a kódhoz fér hozzá, hanem ezekhez a rendszerekhez is.

A plugineket a session-ben a `/plugin` paranccsal telepíted. Mind a három, amire szükségünk van, a beépített `claude-plugins-official` marketplace-ből jön, ezt nem kell külön hozzáadni:

```
/plugin install superpowers@claude-plugins-official
/plugin install commit-commands@claude-plugins-official
/plugin install skill-creator@claude-plugins-official
```

A **superpowers** egy skill-gyűjtemény (például teszt-vezérelt fejlesztés és szisztematikus hibakeresés), a **commit-commands** a git/commit workflow-t adja (`/commit`), a **skill-creator** pedig saját skillek készítéséhez kell. A `/plugin` parancs egy interaktív böngészőt is nyit, ahol telepíthetsz és letilthatsz. Külső, nem hivatalos marketplace-t előbb így adsz hozzá: `/plugin marketplace add <github-repo-vagy-url>`, utána `/plugin install <plugin>@<marketplace>`.

Az MCP-szervereket terminálból (vagy a session-ben a `/mcp` felületen) adod hozzá. Mindegyiknél fontos a hatókör (scope): a **project** scope a repóba kerül (`.mcp.json`), így a csapattal megosztva; a **user** scope minden projektedben elérhető, de személyes; a **local** scope csak az adott projektben, személyesen él. Ezeket telepítsd:

```
# github (project scope) — issue-k és PR-ek kezelése, a repóba kerül, csapattal megosztva.
claude mcp add --transport http --scope project github https://api.githubcopilot.com/mcp/

# Context7 (user scope) — naprakész library-dokumentáció (Prisma, Nx, Anthropic SDK), kevesebb hallucináció.
claude mcp add --transport http --scope user context7 https://mcp.context7.com/mcp

# Postgres (project scope) — az agent rálát a games sémára, READ-ONLY lekérdezéssel fejlesztés közben.
# A read-only connection stringet írd be (a DATABASE_URL_READONLY értékét):
claude mcp add --scope project postgres -- npx -y @modelcontextprotocol/server-postgres "postgresql://boardgame_ro:JELSZO@localhost:5432/boardgame"

# Prisma (project scope) — migrate-dev / migrate-status és a Prisma Studio elérése Claude-ból.
claude mcp add --scope project prisma -- npx -y prisma mcp
```

A telepített MCP-ket a `claude mcp list`, `claude mcp get <név>` és `claude mcp remove <név>` paranccsal kezeled. Windowson a parancsok PowerShellben (vagy WSL-ben) ugyanígy működnek.

## 5. Indulás előtt: a projekt doksijai és a kulcsok

A boardgame felépítéséhez nem üres mappából indulsz: van egy doksi-csomagod (a `docs/` mappa), amit kiindulásként beadsz Claude-nak. Ez írja le, mit kell felépíteni (üzleti követelmény, tech stack, architektúra, kódkonvenciók, fejlesztői workflow), plusz benne van a termék-agent system promptja is. A hat doksi tartalma a leírás végén, a 8. szekcióban egy az egyben olvasható, hogy itt is kéznél legyen.

Mielőtt elindítod az építést, állítsd be a titkokat. Másold a repóban lévő `.env.example`-t `.env`-re, és töltsd ki a saját értékeiddel. Három dolog kell bele: az LLM API kulcsod (`ANTHROPIC_API_KEY`), egy írható-olvasható adatbázis-kapcsolat (`DATABASE_URL`), és egy csak olvasható kapcsolat (`DATABASE_URL_READONLY`):

```
ANTHROPIC_API_KEY=...          # LLM API kulcs
DATABASE_URL=...               # read-write — ezzel migrál és seedel a Prisma
DATABASE_URL_READONLY=...      # read-only — ezt használják az agent belső tool-jai (csak SELECT)
```

A két adatbázis-kapcsolat szándékos, és ez a rendszer egyik legfontosabb biztonsági eleme. A Prisma az írható-olvasható kapcsolaton viszi a sémát, a migrációt és a seedet. Maga az agent viszont csak a read-only kapcsolaton kérdezhet, így soha nem tud adatot módosítani, akkor sem, ha valamelyik belső tool hibás lekérdezést állítana össze. A `.env` fájlt soha ne tedd gitbe; vedd fel a `.gitignore`-ba.

## 6. Az agent felépítése Claude Code-dal (lépésről lépésre)

Innen az agent felépíti a projektet, te pedig irányítod és ellenőrzöd. A módszer végig ugyanaz: terv a kód előtt, kis lépések, minden lépés után tesztelés és commit. Ha egy lépés túl nagyra nőne (sokáig „gondolkodik"), állítsd meg (`Esc`) és bontsd kisebbre.

**1. lépés: indítás és terv.** Indítsd el a Claude Code-ot a projektmappádban (`claude`). Add be neki a doksikat, és add ki az indító promptot, amely tervet kér a kód előtt. Ez a prompt egyben a teljes építés vázát is megadja (előbb a kész környezet, utána három implementációs fázis):

> Olvasd el a projekt dokumentációját, és ez alapján készíts egy implementációs tervet. A releváns library-dokumentációkat MINDEN esetben olvasd be Context7-tel, mielőtt kódolnál. Ha valami nem világos, kérdezz, mielőtt nekikezdenél.
>
> A tervet (proposal) írd a fájlrendszerbe, a /docs mappába. Logikusan fázisolj, hogy minden fázis végén tudjak tesztelni; minden fázis legyen kicsi, önállóan tesztelhető increment, a végén egy commit.
>
> A terv két nagy részből álljon:
>
> A) A KÖRNYEZET LÉTREHOZÁSA (mérföldkő: kész a környezet). Az út addig a pontig, ahol a projekt fut és tesztelhető: Nx monorepo (packages/core + apps/cli), packages/db a Prisma libbel (games séma + migráció), a kész seed betöltése, és egy üres CLI elindul. A függőségek, a seed-adat és a tesztek/scriptek már rendelkezésre állnak, ezekre építs, ne generáld újra a seed-adatot.
>
> B) AZ IMPLEMENTÁCIÓ 3 FÁZISA, EBBEN A SORRENDBEN, hogy a működés rétegről rétegre látszódjon:
>
> 1. fázis — CLI visszhang, LLM nélkül: a CLI-n keresztül interaktálok, és a program visszaírja, amit beírtam (echo). Még nincs LLM és nincs adatbázis.
> 2. fázis — LLM, adatbázis nélkül: a CLI-t bekötöd egy sima LLM-hívásba. Az agent válaszol, DE nincs adatbázis-hozzáférése, ezért az adatra vonatkozó kérdésnél őszintén jelzi, hogy nem fér hozzá a katalógushoz, és nem tud válaszolni.
> 3. fázis — tool-os interakció: bekötöd a search_games toolt. Az agent a kérdésből meghatározza a szűrési paramétereket (játékosszám, játékidő, nehézség, ár), lefuttatja a search_games toolt a katalóguson, és a találatokból valós, természetes nyelvű ajánlást ad.
>
> Minden implementációs lépés után kérd, hogy teszteljek.

Mielőtt jóváhagyod a tervet, érdemes `plan` módban (`Shift+Tab`) dolgozni, hogy Claude előbb csak a tervet mutassa meg, és ne nyúljon a fájlokhoz. Olvasd át, és ha jó, engedd tovább.

**2. lépés: a környezet létrehozása (A rész).** Itt Claude felépíti a vázat: létrehozza az Nx monorepót (a `packages/core` és az `apps/cli` csomaggal), a `packages/db` Prisma-libet a `games` sémával és a migrációval, betölti a kész seedet (kb. 30-40 társasjáték), és elindít egy üres CLI-t. Itt indítod el a lokális adatbázist a projekt gyökerében:

```
docker compose up -d
```

Ezután ellenőrizd, hogy a migráció és a seed lefutott (a Postgres MCP-vel rá tudsz nézni a `games` táblára Claude-ból). Ez a mérföldkő: ha a projekt fut és van benne adat, kész a környezet.

**3. lépés: 1. fázis, CLI visszhang.** A legkisebb működő darab: a CLI visszaírja, amit beírsz, LLM és adatbázis nélkül. Teszteld: ha visszhangoz, mehetsz tovább. Ennek a lépésnek az értelme, hogy a parancssori belépési pont magában is működjön, mielőtt bármi okosat tenne.

**4. lépés: 2. fázis, LLM adatbázis nélkül.** Bekötöd a CLI-t egy egyszerű LLM-hívásba (az Anthropic SDK-val). Mostantól az agent beszélget és válaszol, de még nincs hozzáférése a katalógushoz. Tesztként kérdezz rá konkrét adatra: a jó viselkedés az, ha őszintén jelzi, hogy nincs katalógus-hozzáférése. Ez a lépés mutatja meg, hogy az LLM önmagában nem tud a te adataidról.

**5. lépés: 3. fázis, tool-os interakció.** Bekötöd a `search_games` toolt (a read-only kapcsolaton, csak SELECT). Innen az agent a kérdésből meghatározza a szűrési paramétereket, meghívja a tool-t a katalóguson, és a találatokból természetes nyelvű ajánlást ad. Ez a pont, ahol igazi agent lesz belőle: nyelvi modell, eszköz és többlépéses futás együtt.

**6. lépés: futtatás, a működő rendszer.** Tedd fel élesben a kérdést:

```
pnpm boardgame ask "3-an játszanánk maximum 30 percet valami könnyen tanulható parti játékot, mi van raktáron?"
```

Az agent kiválasztja és meghívja a `search_games` toolt, és visszakapsz egy valódi, természetes nyelvű ajánlást. Ezen a ponton megvan az első működő agented, és érted, mi történik minden rétegben. Innen már csak bővíted: ugyanerre a mintára épül a `similar_games`, `recommend_bundle`, `compare_games`, `get_stock` tool, majd a BoardGameGeek MCP-integráció.

Végig tartsd magad a fegyelemhez: a tervet jóváhagytad, minden lépés után átnézted a változást (diff), teszteltél, és kicsi, fókuszált commitot csináltál. Ez a különbség a „vibe coding" és a felelős, agentic fejlesztés között.

## 7. Hogyan épül fel a rendszer

Hogy értsd, mit építettél, érdemes ránézni a szerkezetre. A projekt egy Nx monorepo: a `packages/core`-ban van az agent-logika (az LLM-hívás, a belső tool-ok, a séma-kontextus és a naplózás), a `packages/db`-ben a Prisma (séma, migráció, kliens, seed), az `apps/cli`-ben pedig a parancssori felület. A részletes fájlstruktúra és az indoklások a 8.3 (Architektúra) szakaszban olvashatók.

Három döntés viszi végig az egészet. Az első, hogy a core nem ismeri a belépési pontot: ma CLI hívja, később lehet API vagy web, anélkül hogy a magot újra kéne írni. A második a két adatbázis-kapcsolat: az agent belső tool-jai csak read-only kapcsolaton kérdeznek (csak SELECT), a Prisma pedig külön, írható kapcsolaton kezeli a sémát és a seedet, így az agent soha nem módosíthat adatot. A harmadik az átláthatóság: minden interakciót naplózol, és egy `--show-prompt` kapcsolóval bármikor megnézheted a modellnek küldött teljes promptot.

A fejlesztést automatizmusokkal is támogathatod, ezek nem kötelezőek a működéshez. A leggyakoribb a szerkesztés utáni automatikus formázás (prettier) és a változáshoz tartozó tesztek futtatása (Vitest). Ezeket hookokként állítod be a `settings.json`-ban; a pontos konfiguráció a 8.5 (Fejlesztői workflow) szakaszban van. Fontos érteni, hogy ezek a hookok a Claude Code műveleteit fogják meg (amit ő szerkeszt vagy futtat), nem a termék futásidejű lekérdezéseit; azt a read-only adatbázis-kapcsolat védi.

## 8. Projekt-doksik (a Claude Code-nak átadott build-input)

Ezt a hat doksit adod be Claude Code-nak kiindulásként (lásd 5. és 6. szekció); a build erre a hat doksira épül.

### 8.1 BRS — üzleti követelmény (build brief)

#### 1. Üzleti igény / probléma

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

##### ROI / mérőszámok

**Hard (forintosítható):**

- Időmegtakarítás: egy ügyfél-ajánlat kézi összeállítása jelenleg 10-15 perc; az agenttel **KPI: egy ajánlat < 5 perc**.
- Jobb ár-érték: az agent figyeli az akciókat, és megtalálja ugyanazt olcsóbban vagy jobb alternatívát → alacsonyabb beszerzési vagy vételi költség az ügyfélnek.

**Soft (valós, de nehezen forintosítható):**

- Magasabb ügyfélélmény (gyorsabb, pontosabb ajánlat).
- Jobb minőségű munka (jobb illeszkedés az ügyfél igényeihez: létszám, idő, nehézség, korosztály).

**Bővítési képesség (későbbi):** korábbi ajánlások/vásárlások elemzése → jobb javaslat; közösségi funkciók (baráti kör meghívása, RSVP-gyűjtés); játékszabály-lekérés. Ehhez ajánlás-történet tárolása kell; a v1 csak a katalógus felett dolgozik.

#### 2. Megoldás

`boardgame`: parancssori (CLI) AI agent, amely a természetes nyelvű kérdést a társasjáték-katalógus (`games`) feletti keresésre és ajánlásra fordítja, belső tool-okon és külső integráción (MCP) keresztül fut, és természetes nyelvű választ ad. Önkiszolgáló ajánlórendszer szakértői tudás nélkül.

#### 3. Hatókör (scope, v1)

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

#### 4. Követelmények

##### Funkcionális (FR)

- **FR1, Kérdezés:** `boardgame ask "<kérdés>"` egyszeri lekérdezés, és interaktív readline mód (amíg `exit`).
- **FR2, NL → tool-hívás:** az agent az LLM-mel eldönti, mely belső tool-t (`search_games`, `similar_games`, `recommend_bundle`, `compare_games`, `get_stock`) és/vagy külső MCP-t (BoardGameGeek) hívja; több lépéses (multistep) loop a végleges válaszig.
- **FR3, Válasz:** a lekérdezés eredményéből természetes nyelvű választ ad, kiemelve a döntéshez fontos attribútumokat.
- **FR4, Naplózás:** minden interakciót logol (`logs/<timestamp>.jsonl`): system prompt, üzenetek, tool-hívások és eredményük, válasz, token-felhasználás.
- **FR5, Átláthatóság:** `--show-prompt` mód, amely kiírja a teljes üzenet-tömböt.

##### Nem-funkcionális (NFR)

- **NFR1, Biztonság:** az agent read-only adatbázis-kapcsolaton fut, csak SELECT.
- **NFR2, Átláthatóság:** a működés naplóból és `--show-prompt`-ból követhető.
- **NFR3, Karbantarthatóság:** a `konvenciok.md` és `architektura.md` betartása.
- **NFR4, Reprodukálhatóság:** a projekt a `stack.md` szerinti, legfrissebb stabil eszközökkel felépíthető.

#### 5. Sikerkritériumok

- A felhasználó természetes nyelven kérdez a katalógusról, és helyes, érthető ajánlást kap szakértői tudás nélkül.
- Demo-kritérium: élő kérdés → helyes tool-hívás(ok) → helyes válasz.
- Az agent soha nem módosítja az adatot (csak SELECT, read-only kapcsolat).
- Minden interakció naplózva; a működés `--show-prompt`-tal átlátható.
- **Hatékonyság (KPI):** egy ügyfél-ajánlat vagy játékcsomag 5 perc alatt összeállítható (a korábbi 10-15 perc helyett).

#### 6. Adat

A `games` (társasjáték-katalógus) tábla a domain. A pontos séma a `stack.md`-ben. Szintetikus seed, valós játékcímekkel és reális attribútumokkal (játékosszám, játékidő, nehézség, korosztály, ár, készlet).

### 8.2 Tech stack + games séma

Elv: iparági best practice, legfrissebb STABIL verzió (se cutting-edge, se elavult).

- Nyelv / monorepo: TypeScript (strict), Nx, pnpm, Node LTS
- DB: PostgreSQL lokálisan docker-compose-ban (OrbStack futtatja), Prisma (ORM: séma, migráció, seed, typed query). Helyben dolgozunk, nincs felhő-DB.
- Agent: Anthropic SDK (hivatalos kliens, nem nyers HTTP) + saját tool-use loop, agent-framework nélkül. Zod (validáció)
- Külső integráció: MCP-kliens a BoardGameGeek API-hoz (valós értékelés, komplexitás, játékosszám-ajánlás)
- CLI: commander + node:readline
- Tooling: Vitest, ESLint + Prettier, tsx
- Eszköz: Zed, gh CLI

#### games séma

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

##### Értékkészletek (kategorikus mezők)

- **category:** parti, stratégiai, család, kooperatív, kártya, absztrakt, dobókockás, roguelike
- **complexity:** könnyű, közepes, nehéz

### 8.3 Architektúra (fájlstruktúra + döntések)

#### Fájlstruktúra (Nx monorepo)

```
boardgame/
├── packages/core   agent-logika (LLM-hívás, belső tool-ok, MCP-kliens, séma-kontextus, naplózás)
├── packages/db     Prisma lib (séma, migráció, kliens, seed) — NEM a gyökérben
├── apps/cli        CLI (ask parancs + interaktív mód)
├── docs            dokumentáció (lásd dev-workflow.md)
└── konfig          nx, package.json, .env, docker-compose

Később (NEM most): apps/api, apps/web
```

(Csak nagy vonalakban; a fájl-szintű bontást Claude generálja a konvenciók szerint.)

#### Főbb technológiai döntések

1. **Framework-agnostic core.** A `packages/core` nem ismeri a belépési pontokat (CLI/API/web). Új felület = új app, nem újraírás.
2. **Két DB-kapcsolat, két jog.** Az agent belső tool-jai (`search_games`, `similar_games`, `recommend_bundle`, `compare_games`, `get_stock`) READ-ONLY kapcsolaton futnak (`DATABASE_URL_READONLY`), csak SELECT. A Prisma READ-WRITE kapcsolaton (`DATABASE_URL`) viszi a sémát, migrációt, seedet. Az agent NEM Prismán kérdez.
3. **Saját agent-loop.** Az `askAgent` az Anthropic SDK-ra (hivatalos kliens, nem nyers HTTP) épülő, kézzel írt tool-use loop, agent-framework nélkül, hogy a mechanika látható maradjon.
4. **Belső tool és külső MCP explicit határa.** A `packages/core` öt belső tool-t exportál a `games` táblán olvasva; a BoardGameGeek MCP-kliens külön modul, ami külső, nyilvános API-t hív. Mindkettő ugyanabba a tool-use loopba regisztrálódik, de a kódban jól látszik, melyik tool DB-t olvas és melyik hálózatot hív.
5. **Átláthatóság beépítve.** Minden interakció JSONL-be naplózva; `--show-prompt` a teljes prompt megjelenítéséhez.
6. **Lokális DB.** docker-compose Postgres, OrbStack futtatja. Helyben dolgozunk, nincs felhő-DB.
7. **Prisma külön Nx lib.** A Prisma (séma, migráció, kliens, seed) a `packages/db` libben él, NEM a repo gyökerében: a séma az Nx graph része, a core és a seed onnan importál.
8. **Library-doksi munka előtt.** Új vagy ritkán használt API-nál (pl. Prisma, MCP SDK, BoardGameGeek API) ELŐBB beolvassuk a doksit Context7-tel, csak utána kódolunk, mert így kevesebb a hiba a tesztek alatt.

Konvenciók: `konvenciok.md`. Git/hook/automatizmus: `dev-workflow.md`.

### 8.4 Kódkonvenciók

#### Naming

- `camelCase` változó/függvény, `PascalCase` típus/osztály/komponens, `UPPER_SNAKE` konstans.
- Beszédes nevek; boolean: `is`/`has`/`can` prefix; függvény = ige (`fetchUser`, `parseQuery`).
- Fájlnév: `kebab-case`. Egy fájl egy felelősség.

#### TypeScript

- `strict` mód. Explicit típus a publikus API-n; lokálisan elég az inferencia.
- `unknown` a külső/megbízhatatlan inputra, NEM `any`; szűkíts biztonságosan.
- `interface` objektum-alakra (ami bővülhet), `type` unió/intersection/utility-re. String literal union `enum` helyett.
- Immutabilitás, ne mutálj:
  ```ts
  // rossz: obj.x = 1
  // jó:    const next = { ...obj, x: 1 }
  ```

#### Hibakezelés

- async `try/catch`; az `unknown` errort szűkítsd (`instanceof Error`).
- Ne nyeld el a hibát némán; UI-facing üzenet + szerver-oldali részletes log.
- Validáció a rendszer-határokon (Zod), fail-fast, beszédes hibaüzenet.
  ```ts
  const Input = z.object({ text: z.string().min(1) });
  ```

#### Tesztelés

- TDD ahol értelmes: piros (bukó teszt) → zöld (minimál implementáció) → refaktor.
- Szintek: unit (függvények), integration (DB/API), E2E kritikus flow-ra (Playwright).
- Egy teszt egy dolgot ellenőrizzen; beszédes nevek ("should ... when ...").
- Determinista, izolált tesztek; ne függj külső/globális állapottól vagy időzítéstől.
- Cél: 80%+ lefedettség.

#### Fájlszervezés

- Sok kis, fókuszált fájl (200-400 sor, max 800). Magas kohézió, alacsony csatolás.
- Feature/domain szerint rendezz, ne típus szerint.
- Nincs mély beágyazás (>4 szint); korai return.

#### Naplózás

- Nincs `console.log` a termékkódban → strukturált logger.

#### Biztonság

- Titkok env-ben (`.env`), soha a repóba (gitignore).
- Minden külső adat (user input, API-válasz, LLM-output) megbízhatatlan: validáld, ne bízz benne.
- Paraméterezett lekérdezések; ne építs query-t string-konkatenációval.

#### Az agent promptjai (XML-szerű struktúra)

- Amit a **TERMÉK** ad át az LLM-nek (a system prompt és az askAgent üzenetei), azt **XML-szerű tagekkel** strukturáljuk: így a részek elkülönülnek, és csökken a hallucináció.
- Ez NEM a fejlesztői, Claude Code-nak adott promptokra vonatkozik, azok természetes nyelvűek maradnak.
- Ajánlott tagek: `<role>`, `<schema>`, `<rules>`, `<examples>`, `<question>` (a nevek szabadon választhatók, de legyenek beszédesek és konzisztensek).
- Minta (a boardgame agent system promptjából):
  ```xml
  <role>Boardgame asszisztens vagy: társasjáték-katalógus kérdésekre válaszolsz és ajánlasz.</role>
  <schema>games(id, name, category, complexity, players_min, players_max, playtime_min_minutes, playtime_max_minutes, price, sale_price, stock, ...)</schema>
  <rules>
  - Csak olvasó (read-only) tool-t hívj. ILIKE a szöveges szűrésre, mindig LIMIT.
  - Ár: COALESCE(sale_price, price).
  - Ha nincs találat, mondd meg; ne találj ki nem létező játékot vagy oszlopot.
  </rules>
  ```

#### Git

- Conventional Commits, feature branch, kicsi fókuszált commitok. Részletek: `dev-workflow.md`.

### 8.5 Fejlesztői workflow + automatizmus

#### Git

##### Branching

- `main`: mindig zöld, deploy-olható. Közvetlenül main-re NEM commitolunk.
- Feature branch: `feat/<rövid-leírás>` (pl. `feat/search-games-tool`). Egyéb prefixek: `fix/`, `refactor/`, `docs/`, `chore/`.

##### Commit (Conventional Commits)

Formátum: `<típus>: <leírás>`. Típusok: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`.
Példák: `feat: add search-games tool`, `test: cover recommend-bundle budget guard`.

##### Auto-commit

Minden befejezett, koherens lépés után kicsi, fókuszált commit (egy lépés = egy commit). Lásd a `Stop` hookot.

#### Hookok (`settings.json`)

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

#### /docs (a repóban)

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

#### Dokumentáció-frissítés

A `/docs` dokumentációt igény szerint, külön lépésben frissíted (a git-history alapján, pl. a `ddd-audit` skill-lel).

### 8.6 A termék system promptja (L2, XML-szerűen tagolt)

Ez NEM a Claude Code-nak adott build-prompt, hanem maga a boardgame termék-agent utasítása. A build során a `core/schema-context` ezt adja a modellnek.

```xml
<role>
Te a Boardgame asszisztens vagy: egy társasjáték-bolt eladójának (és ügyfeleinek) segítesz társasjátékot választani és ajándékötletet vagy játékcsomagot összeállítani egy webshop katalógusa alapján.
</role>

<task>
A felhasználó természetes nyelvű kérdését fordítsd a megfelelő tool-hívás(ok)ra a games tábla felett, futtasd le a tool(oka)t, majd a kapott eredményből adj rövid, érthető, magyar nyelvű választ.
</task>

<schema>
games (
  id, name, bgg_id,
  category,                                    -- parti / stratégiai / család / kooperatív / kártya / absztrakt / dobókockás / roguelike
  complexity,                                   -- könnyű / közepes / nehéz
  players_min, players_max,                     -- játékosszám tartomány
  playtime_min_minutes, playtime_max_minutes,   -- játékidő tartomány
  min_age,                                      -- ajánlott minimum életkor
  price, sale_price, stock,                     -- ár, akciós ár (null ha nincs), raktárkészlet
  rating, reviews_count, description
)
</schema>

<rules>
- CSAK olvasó (read-only) tool-t hívj. Soha ne módosíts adatot.
- Játékosszám szűrésnél a kért létszámnak bele kell férnie a [players_min, players_max] tartományba.
- Játékidő szűrésnél a kért időkeretnek bele kell férnie a [playtime_min_minutes, playtime_max_minutes] tartományba (ha a felhasználó "maximum X perc"-et mond, playtime_max_minutes <= X).
- Ár: a tényleges ár COALESCE(sale_price, price) (ha van akció, az számít). Büdzsénél ezzel számolj.
- Raktár: ha "raktáron" vagy "azonnal vihető" a kérés, szűrj stock > 0-ra.
- Ha a felhasználó BoardGameGeek-értékelést, valós közösségi visszajelzést vagy a katalógusban nem szereplő játékról kér infót, a BoardGameGeek MCP-t hívd, ne találj ki adatot.
- Ne találj ki nem létező játékot, kategóriát vagy oszlopot.
</rules>

<behavior>
- Ha a kérdés kétértelmű (hiányzik a büdzsé, a játékosszám, a rendelkezésre álló idő vagy a korosztály), KÉRDEZZ vissza, mielőtt találgatnál.
- Csomag- vagy ajándékajánlásnál vedd figyelembe a büdzsét, a játékosszámot, a rendelkezésre álló időt és a korosztályt.
- A válaszban emeld ki a döntéshez fontos attribútumokat: ár (és akció), raktárkészlet, játékosszám, játékidő, nehézség.
- Légy tömör: a végén természetes nyelvű összegzés, ne nyers tábla-dump.
- Ne találj ki nem létező játékot vagy oszlopot.
</behavior>

<tools>
- search_games(players, playtime, complexity, genre, age): szűrt keresés a katalógusban.
- similar_games(name): "ha ez tetszett, ez is" ajánló.
- recommend_bundle(criteria): csomag-összeállítás megadott szempontok szerint (pl. "családi estére 4 főre, 60 perc alatt").
- compare_games(names): összehasonlító mátrix több játékra.
- get_stock(name): raktárkészlet-ellenőrzés.
- BoardGameGeek MCP: külső, valós értékelés, komplexitás és játékosszám-ajánlás lekérése, ha a katalógus adata nem elég vagy a felhasználó explicit közösségi véleményre kíváncsi.
</tools>
```
