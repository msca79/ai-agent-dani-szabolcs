AI: 5%   
---ezzel azt jelzem, hogy a szöveg ami jön mennyi AI generált tartalmat tartalmaz. (de a helyesírási hibákból is lehet következtetni :D) 

## 0., Átalakítás, előszó

- A korábbi nx monorepo megoldással nem voltam megbékélve. Inkább talán személyes ellenszenvem van vele, hogy túlságosan "zajos" és mély struktúrákat eredményez. Mire odamegyek egy fájlhoz, át kell barangolnom a fél világon. Ezért megválltam a monorepó-tól, remélem ez nem okoz negatív pontokat :) Első körben az npm workspace jött elő, az már jobb volt, de nem éreztem még magaménak. Végül egy pure typescript projekt lett belőle, minden az `src` alatt, de mappákba szervezve. Ez nekem sokat segít a megértésben, csökkenti a "kontextusomat" :D és h csak a kódra tudjak fókusználni
- Sajnos közben a commit history szétesett, kerültek bele olyan kommitok amik nem túl összeszedettek.  Még ha lesz időm squasholok egyet rajta. 

## 1., Use case és tudásbázis
**leadandó:** működő repo: ingest + keresési pipeline + agent, futtatási instrukciókkal

A saját ötletemet folytattam, a társasjátékok szabálykönyveit terveztem betölteni RAG-ba. Első probléma az volt, hogy azok általában PDF-ek képekkel tarkítva, a rag meg szöveg alapú. Erre született megoldás az `app/rule-book-converter`. Ez felolvas egy megadott mappát (`rulebooks`) és az abban lévő PDF-eket odaadja egy vision képes llm modellnek, azzal a felszólítással, hogy képezzen belőlük csak szöveg alapú (txt) adatot. Ha képet talál magyarázza el a szövegben. (Markdown formátumot ad, de txt lett a neve, ezen még egyet iterálnom kellett volna, ezt nem hagynám így production-be menni)

Először a Sonet 5-re mentem rá, azzal 20 cent volt egy pdf konvertálása, utána a Haiku 4.5, azzal már csak 5 cent. Így vertem el kb 1.2 $ -t konvertálásra :D

Az eredeti pdf-eket kézzel halásztam össze, nem találtam rá forrást. Ezeket nem kommitáltam fel mivel ~50 megabájtosak, de tudom prezentálni őket.

Behoztam a Makefile használatomat, ezt használom a projektjeimben. Így egy helyre van dokumentálva az indítási módok, sokat segít ha több projekt között ugrálni kell. 


## 2., Chunking stratégia és indoklás
```
Az órán látott bekezdés-alapú chunkolás direkt túlegyszerűsített — arra volt jó, hogy a minta látszódjon. Fejleszd tovább tetszőlegesen, és írd le az indoklást: mi következik a tudásbázisod tagoltságából, mit nyersz a változtatással. A felesleges túlbonyolítás sem érdem — a jó stratégia a tudásbázishoz illik, nem a bevetett technikák számán múlik.
A chunkolás determinisztikus → tesztelhető. Legalább pár unit teszt legyen rajta.
```
**leadandó:** chunking-stratégia leírása indoklással   
**értékelés:** _a chunking-döntéseid a tudásbázisodból következnek, nem másolatok_

Stratégiák: 

### 2.1., olcsó, karakter alapú chunk fixed-size-chunking.ts
sorokat gyűjt egy célméretig (karakterben), a következő chunk pár sorral korábban kezdődik (átfedés), hogy a chunk-határon átnyúló mondatok/szabályok ne vesszenek el a kereséskor.

### 2.2., drágább, LLM meghatározza a szemantikai szakszokat llm-semantic-chunking.ts
egy kis Claude modell jelöli ki a szemantikus szakaszhatárokat (structured output), majd ezek alapján vágjuk ki a chunkokat az eredeti szövegből. Modell: claude-haiku-4-5

Indoklás: 
- load-knowledge.ts-ben most a fixed-size a bekapcsolt alapértelmezett stratégia. Egyértelműen az olcsósága miatt. 

Egyéb chunkolási megoldások: 
 - Egyik érdekes javaslat, hogy mondatonként embeddig-elünk és akkor vágunk amikor a következő mondat hasonlósága megváltozik. Ez azt sugallja hogy új rész kezdődik.
 - Másik, amit nem is értek, de valami olyasmi, hogy egy gyerek chunkot nézünk, majd hozzávesszük a szülő chunkot, és amikor átadjuk a chunk tartalmát, nem csak a gyereket, hanem a szülőt is adjuk, így a kontextus már adottabb. (gyanítom itt nagyobb lesz a tárhely, mert a szülő chunkot is tárolni kell, de lehet relációs módon csökkenthető, míg a komplexitása növekszik)


## 3., Keresés pipeline
```
Kötelező elemek:
Embedding + vektor-tárolás: pgvector ajánlott, de ha mást választasz, indokold
HyDE
Rerank
Grounding: a válaszok forráshivatkozással (dokumentum címe / URL / fájlnév), és ha nincs találat, az agent kimondja
Multi-provider routing: A pipeline-ban legalább két különböző provider modelljét használd. Írd le a szereposztást és az indoklást:
melyik modell mit csinál, és miért pont az.
```
**leadandó:** golden set + nyers vs. teljes pipeline összevetés + a negatív teszt eredménye   
**leadandó:** multi-provider szereposztás leírása
**értékelés:** a grounding működik — a negatív teszt átmegy   
**értékelés:** a routing-döntéseid indokoltak   

- pgvector: `docker-compose.yml`-ben van, `pgvector/pgvector:pg16`
- HyDE (`hyde.ts`)
- rerank (`rerank.ts`)
- grounding (`grounding-check.ts`, be van kötve a query-agent.ts-be a válasz után, log-only)
- Multi-provider: Anthropic `claude-haiku-4-5` a HyDE/rerank/grounding/szemantikus chunkoláshoz, OpenAI `text-embedding-3-small` az embeddinghez. Lehetne még finomítani, mindenre van megfelelőbb ár/érték arányú modell. 
 - példa futás a `hazifeladat3-run1.md` fájlban


## 4., Golden Set
```
Állíts össze 5–10 kérdésből álló tesztkészletet a saját domainedből, és futtasd le mindet kétféleképpen:
1. nyers vektorkeresés (csak embedding + távolság)
2. teljes pipeline (HyDE + rerank)
   A kettő összevetését dokumentáld (táblázat vagy a debug-kimenetek). Legalább egy kérdésnél mutasd
   be konkrétan, hogy a rerank átrendezte a sorrendet — és írd le, miért jobb az új sorrend. Ha egyetlen
   kérdésnél sem rendez át semmit, az is eredmény: akkor azt magyarázd meg, miért nem.
   Negatív teszt
   A golden setben legyen legalább egy kérdés, amire a tudásbázisodban nincs válasz — és mutasd be,
   hogy az agent ezt ki is mondja, forráskitalálás helyett. Ez a grounding próbája: enélkül a prompt-szabály
   csak dísz.
```
**értékelés:** a golden set valóban megmutatja, mit ad hozzá a HyDE és a rerank

A Hyde, Rerank parancssorból kikapcsolható, így külön külön futattam, hogy látszódik-e különbség
pl:  `HYDE_ENABLED=false RERANK_ENABLED=false npm run cli -- ask "$question"`
Készült egy tesztelő szkript `run-golden-set.sh`, ami 5 kérdés lefuttat ki és bekapcsolt flagek mellett is. Az eredményt is bekommitoltam, bár ilyet nem illik.. 20260729-140431 mappába

### Fogalmak
 - full: HyDE és rerank aktív
 - raw: nyers pipeline

### tapasztalatok, észrevételek

- a raw többször hívja az llm-et, mig a full kevesebbszer, ez talán azt jelzi, hogy jobb minőségű a válasz és nincs szükség annyi iterációra
- a full mindig rövidebb, a raw mindig hosszabb választ ad
- az 5. kérdésre nincs válasz, mert a Dixit szabálykönyve nincs a rag adatbázisban. Ezt ügyesen be is vallja mindkét esetben. Full esetében jelzi, hogy saját fejéből talál ki valamit, de próbálkozik vele.

## 5., Karbantartásra egy arhitektúra javaslat
```
A tudásbázis nem statikus — a forrás holnap változik, a vektoraid a tegnapi igazságot mondják. Ezt NEM
kell leimplementálni. Amit kérünk: egy külön dokumentum ( docs/ARCHITEKTURA.md ), ami leírja,
hogyan oldanád meg az inkrementális frissítést a saját rendszeredben:
honnan tudod, hogy egy dokumentum változott (és hogyan éred el, hogy ami nem változott, ne
vektorizálódjon újra)?
mi történik az új dokumentummal?
mi történik a törölt dokumentum chunkjaival?
mikor / mi triggereli az újraindexelést?
Kötelező melléklet: egy architektúra-ábra (Miro, draw.io vagy hasonló — screenshot / export a repóba).
Az ábrán látszódjon a teljes adatfolyam: forrás → változásérzékelés → chunk → embed → tárolás, és a
törlés/módosítás útja
```
**leadandó:** docs/ARCHITEKTURA.md a tudásbázis-karbantartás tervével + ábra-screenshot   
**értékelés:** az architektúra-spec végiggondolt — az eseteket lefedi, az ábra követhető   

A docs/ARCHITEKTURA.md. 3 oldalról közelítettem. 
1., full reindex, ha kevés adat van, vagy olcsó a reindex (pl lokális embedding modellünk van)
2., fájl változás detektálás. Ha egy fájl változott, akkor csak azt frissíti
3., fájl részlet változás. Bevallom itt még én is csak sejtem, hogy jó a megoldás, de ez már humán arhitekt gondolkodást és masszív fejlesztői munkát igényel (még AI segítséggel is)
sokat segíthet ha a doksinak vannak jellegzetességei, pl számozott fejezetek, akkor azokra lehet építeni a változás detektálást. Ez viszont az adott projekten dől el. Ha teljesen amorf random struktúrájú dokumentumokat kell rag-olni és azok méretben is jelentősek, akkor azért jobban neki kell ülni papír-ceruzával a feladatnak :D 


## 6., Költségbecslés
```
Egy rövid bekezdés a README-ben:
mennyibe került a teljes tudásbázis vektorizálása (ingest)?
mennyibe kerül egy kérdés a teljes pipeline-nal (HyDE-hívás + embedding + rerank + válasz)?
Elég a nagyságrend, de a saját számaidból — nem az órai példából.
```
**leadandó:** költségbecslés

### 6.1., Mennyibe került a vektorizálás?
`make rag` kiírja a konzolra: 
```
7-Csoda.txt: 34 chunk, ~0 token (chunking), ~23171 token (embedding)
Azul.txt: 10 chunk, ~0 token (chunking), ~6954 token (embedding)
Bang.txt: 22 chunk, ~0 token (chunking), ~14487 token (embedding)
Camel.txt: 18 chunk, ~0 token (chunking), ~12069 token (embedding)
Carcassonne.txt: 13 chunk, ~0 token (chunking), ~8528 token (embedding)
Catan.txt: 14 chunk, ~0 token (chunking), ~9746 token (embedding)
Colt-express.txt: 15 chunk, ~0 token (chunking), ~9847 token (embedding)
Dobble.txt: 10 chunk, ~0 token (chunking), ~6688 token (embedding)
Fedonevek.txt: 18 chunk, ~0 token (chunking), ~12889 token (embedding)
Fesztav.txt: 20 chunk, ~0 token (chunking), ~13881 token (embedding)
Hanabi.txt: 8 chunk, ~0 token (chunking), ~5032 token (embedding)
Ticket To Ride Europe.txt: 22 chunk, ~0 token (chunking), ~15060 token (embedding)
Kész: 12 sikeres, 0 hibás, 204 chunk összesen, ~0 token (chunking), ~138352 token (embedding).
```
140k token, ez nem egy nagy tétel, de az szöveganyag se volt lehet elég nagy :( 

### 6.2., mennyibe kerül egy kérés a pipelineból?

A goldet-set futtatásból keletkezett adatokra ráküldtem egy összegzőt, ami ez lett: `20260729-140431.report.md`

A full pipeline kb feleannyi tokent használt mint amikor semmi extra nem volt benne. Full ~50k Raw: ~102k
Ezt elsőre nem értem mért is kevesebb :) Talán mert finomítani tudott a kérdésen, ezért kevesebb hívással jobb minőségű eredményt tudott elérni.

Egy kérdés a teljes pipelineban: 19782, 40825, stb... de inkább a `20260729-140431.report.md` full összesen sorát nézzétek, ott szebben összegezve van. 
Az 5 kérdés 50k token-be került.

### 6.3., token használat.

A házi feladathoz használtam csak az api kulcsaimat, így a usage résznél ezek a számok voltak:
- openai 0.01$ fogyott   
- claude-on 2.1$ (ennek legnagyobb része a szabályok átkonvertálása volt)

Ebből nehéz lenne bármit is jósolni. De megnyugtató, hogy sokkal olcsóbb mint gondoltam. Ez bátorít, hogy jobban belemásszak.

## 7., Utószó

- Az órán látott üzenet tárolás, debug adatokkal nagyon tetszett, azt még mindenképp beleteszem valamikor. Sajnos időm nem volt rá. Szeretem én is ha látszik, hogy egy alkalmazás miért úgy működik, ahogy működik. Ez, hogy az üzenetekbe betároljuk a tool-ok használatát, és az még látszik a felületen is, csodálatos. Ilyen mindenképp szeretnék.
- A házifeladatra szánt idő épp arra volt elég, hogy megérintsen ez is mekkora terület. Már nagyjából értem mit jelent mikor valaki azt mondja hyde vagy grounding. Bár működésre is rábírtam, de még nem látok rá teljesen a fogaskerekek találkozására. A rag-ot már ismertem, így féltem, hogy újat nem mond, de megint tévedtem és csak kapaszkodok, hogy követni tudjam az eseményeket :) 
