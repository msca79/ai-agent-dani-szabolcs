//AI: 97%

# Tudásbázis karbantartás — inkrementális frissítés architektúrája

> Ez a dokumentum tervet ír le, NEM implementációt. Két versengő stratégiát
> vázol fel: **A) full reindex** (a jelenlegi `load-knowledge.ts` viselkedése)
> és **B) inkrementális frissítés**, utóbbira két változatban — egy gyors,
> kevés gépezetű verzióban (B1), és egy jobban összeszedett, enterprise-osabb
> verzióban (B2), ami B1 hiányosságait oldja meg.

## A) Full reindex — a legegyszerűbb, legolcsóbban építhető megoldás

Minden triggerkor a teljes `rulebooks/` mappa újrafeldolgozódik: `DELETE FROM
knowledge`, majd minden fájl chunkolása + embedelése elölről — pontosan ez
történik ma is.

- **Honnan tudod, hogy változott?** Sehonnan — nincs megkülönböztetés
  változott/változatlan fájl között, minden futás mindent újrafeldolgoz.
- **Mi történik az új dokumentummal?** Nincs külön eset: a következő teljes
  futásnál automatikusan bekerül, mert egyszerűen ott van a mappában.
- **Mi történik a törölt dokumentum chunkjaival?** Automatikusan eltűnnek — a
  `DELETE FROM knowledge` mindent töröl, és csak a ténylegesen jelenlévő
  fájlokból épül újra a tábla.
- **Mi/mikor triggereli?** Kézi (`npm run ingest`) vagy egyszerű cron —
  lényegtelen, hogy milyen gyakran fut, mert a művelet idempotens.

**Miért ez a "gazdaságosabb" választás jelenlegi léptéken:** nulla extra
tábla, nulla diff-logika, nulla állapot-kezelés — a legkisebb fejlesztési és
üzemeltetési felület. Ez ténylegesen számít, mert a nyers token-költség kicsi:
`text-embedding-3-small` (~0,02 $ / 1M token) mellett a teljes 12 rulebook-os
korpusz (kb. 300 KB szöveg, nagyságrendileg 80-100k token) újraembedelése is
csak néhány centbe kerül; a chunkolás (fixed-size stratégiával) LLM-hívás
nélküli, ingyenes. Ezen a léptéken egy diff-mechanizmus megépítése és
karbantartása mérnöki időben drágább, mint amennyit a full reindex
token-költsége valaha kitenne.

**Korlátja:** nem skálázódik — ha a korpusz mérete vagy változási gyakorisága
nő, a token-költség és a futásidő minden triggernél lineárisan nő a teljes
korpusz méretével, függetlenül attól, hogy ténylegesen mennyi változott.

## B) Inkrementális frissítés

Közös alap mindkét inkrementális változathoz: egy `documents` metaadat-tábla,
ami dokumentum-szinten tartja számon, mi van már indexelve.

```sql
documents (
  file_name       text primary key,
  content_hash    text not null,      -- sha256 a fájl teljes tartalmán
  last_indexed_at timestamptz not null
)
```

### B1) Gyors megoldás — fájl-szintű granularitás

Fájlonkénti hash-ellenőrzés dönti el, kell-e egyáltalán foglalkozni a
fájllal; ha igen, a **teljes fájl** újra-chunkolódik és újraembedelődik
(nincs chunk-szintű finomítás).

- **Honnan tudod, hogy változott?** `sha256(fájltartalom)` összevetve a
  `documents.content_hash`-sel. (Nem mtime — a rulebook-konverzió néha
  azonos tartalommal generál újra fájlt, ilyenkor az mtime hazudna, a hash
  nem.)
- **Mi történik az új dokumentummal?** Nincs sor rá a `documents`-ben →
  teljes chunk + embed, majd `documents` sor beszúrása a hash-sel.
- **Mi történik a törölt dokumentum chunkjaival?** Hard delete: ha egy
  `documents`-ben szereplő `file_name` már nincs a mappában,
  `DELETE FROM knowledge WHERE file_name = X` + `DELETE FROM documents
  WHERE file_name = X`.
- **Mi/mikor triggereli?** Ugyanaz, mint A)-nál (`npm run ingest`, kézi vagy
  cron) — csak a script belsőleg most már a hash-guard-ot használja, mielőtt
  bármit chunkolna/embedelne.

**Nyereség:** ha 12 fájlból csak 1 változik, a másik 11-re nulla LLM/
embedding hívás történik. Ára minimális: egy extra tábla + egy
hash-összehasonlítás a meglévő `load-knowledge.ts` ciklusában.

**Korlátja:** ha egy fájlon *belül* csak egy oldal módosul, a teljes fájl
mégis újra megy — a jelenlegi `fixed-size-chunking.ts` amúgy is pozíció-
(sor-ablak-) alapú, úgyhogy részleges újrafuttatás chunk-szintű diff nélkül
szét is csúsztatná a chunk-határokat. Nagy dokumentumoknál ez pazarló marad.

### B2) Enterprise-osabb, összeszedettebb megoldás — chunk-szintű granularitás

B1-re épül, annak hiányosságait oldja meg:

1. **Chunk-szintű részleges frissítés.** A `documents` tábla kap egy
   `raw_text` mezőt (előző futáskori teljes szöveg). Ha a fájl-szintű hash
   eltér, egy sor-alapú diff (pl. Myers-diff / npm `diff` csomag) kiszámolja,
   mely sor-tartományok ("hunk"-ok) változtak. Csak azok a `knowledge`
   chunkok törlődnek és generálódnak újra, amelyek metszenek egy hunk-ot; a
   hunk utáni, tartalmában változatlan chunkok sorszáma egy sima
   `UPDATE knowledge SET start_line = start_line + delta, end_line =
   end_line + delta WHERE ...`-val tolódik el — embed-hívás nélkül.
   → *Honnan tudod, hogy változott* itt chunk-szintre finomodik: nem csak
   "ez a fájl más", hanem "pontosan ezek a sorok mások".
2. **Atomikus csere.** A régi chunkok törlése és az újak beszúrása egy
   DB-tranzakcióban fut, hogy a `search_knowledge` tool soha ne lásson
   részlegesen frissített, inkonzisztens állapotot egy módosítás közben.
3. **Soft delete / tombstone törölt dokumentumra.** Hard delete helyett
   `deleted_at timestamptz` mező a `knowledge`/`documents` táblán; a keresés
   `WHERE deleted_at IS NULL`-t kap, egy külön purge-job (pl. heti cron)
   takarítja ki a véglegesen törlendő sorokat és karbantartja a HNSW
   indexet. → *Mi történik a törölt dokumentum chunkjaival* itt auditálható:
   visszakereshető, mikor és melyik chunk tűnt el.
4. **Idempotens, hibatűrő futás.** Fájlonkénti try/catch (ez már ma is megvan
   a `load-knowledge.ts`-ben) + retry/backoff az embedding és chunking API
   hívásokra, és egy `ingest_runs` naplótábla (futás ideje, feldolgozott/
   hibás fájlok száma, felhasznált tokenek) — megfigyelhetőség console.log
   helyett.
5. **Trigger.** Batch-esen ugyanúgy indítható, de itt már reális opció
   webhook/esemény-alapú indítás is (pl. ha a rulebook-ok forrása egy CMS
   lenne sok szerkesztővel) — ez opcionális ráépítés, nem alapkövetelmény.

**Ára:** számottevően nagyobb fejlesztési és karbantartási felület
(diff-logika, tranzakciókezelés, purge-job, megfigyelhetőség). Cserébe a
token-költség a tényleges változás méretével arányos, a dokumentum méretétől
függetlenül, és a rendszer nagyobb léptékben is auditálható/megfigyelhető
marad.

**Nagyságrendi példa:** egy ~60 chunk-nyi (30 oldalas) szabálykönyvben egy
oldalnyi (~2 chunk-ra eső) módosítás A)-val és B1-gyel is a teljes fájl
(60 chunk) újraembedelését fizetné ki; B2-vel kb. 2-4 embed-hívás elég — 15-
30×-os token-megtakarítás ezen az egy fájlon, ami a dokumentum méretével
arányosan nő.

## Összehasonlítás

| | **A) Full reindex** | **B1) Inkrementális, gyors** | **B2) Inkrementális, enterprise** |
|---|---|---|---|
| **Technológia** | Nincs extra állapot, csak a meglévő ingest script | +`documents` tábla, fájl-hash | +`raw_text`, sor-diff, tranzakció, tombstone, futás-napló |
| **Granularitás** | Nincs (mindig minden) | Fájl | Chunk (sor-tartomány) |
| **Adathelyfoglalás** | Minimális | +1 tábla, kis mezők | +teljes szövegmásolat dokumentumonként, +ingest-napló |
| **Token-költség** | O(teljes korpusz) minden futásnál | O(változott fájlok) | O(ténylegesen változott szövegrész) |
| **Fejlesztési komplexitás** | Nagyon alacsony | Alacsony (kb. fél nap) | Közepes-magas (diff, tranzakció, purge-job) |
| **Mikor éri meg** | Kicsi (10-20 dok.), ritkán változó korpusz | Közepes méretű vagy gyakrabban változó korpusz, de tipikusan egész dokumentumok cserélődnek | Nagy és/vagy nagy dokumentumokból álló korpusz, gyakori, lokális (pl. egy-egy oldalas) módosításokkal |

## Adatfolyam-ábra (B2, a legteljesebb eset)

A és B1 ennek egyszerűsítései: A) kihagyja a teljes "változás-érzékelés"
dobozt (mindig a FULL ágon fut), B1 csak a "sor-diff" dobozt hagyja ki
(fájl-szinten dönt, de a talált változást a teljes fájlra alkalmazza).

```
                         ┌───────────────────┐
                         │  rulebooks/*.txt   │  (forrás)
                         └─────────┬──────────┘
                                   │ readdir + sha256(tartalom) minden fájlra
                                   ▼
                  ┌────────────────────────────────────┐
                  │   documents tábla (file_name,       │
                  │   content_hash, raw_text,            │
                  │   last_indexed_at)                   │
                  │        — változás-érzékelés —        │
                  └───┬─────────────┬──────────────┬────┘
                      │             │              │
        hash egyezik  │  hash eltér │ file_name    │ documents-ben van,
        (SKIP, nincs  │  vagy       │ nincs a      │ de a mappában már
        hívás)        │  új fájl    │ documents-ben│ nincs (törölve)
                      │             │ (új fájl)    │
                      ▼             ▼              ▼
                    ---        ┌──────────┐   ┌───────────────────────┐
                                │ B2: sor- │   │ Hard delete (B1) vagy   │
                                │ diff a   │   │ soft delete/tombstone   │
                                │ raw_text │   │ (B2):                   │
                                │ ellen    │   │ knowledge.deleted_at =  │
                                └────┬─────┘   │ now() / DELETE          │
                                     │          │ WHERE file_name = X     │
                        ┌────────────┴───────────┐└────────┬──────────────┘
                        ▼                        ▼          ▼
                 ┌─────────────┐         ┌──────────────┐  (purge-job
                 │ Új fájl esetén        │ Módosult      │   később
                 │ / A / B1: teljes      │ fájl esetén,   │   takarít, B2)
                 │ fájl chunkolása       │ B2: csak a     │
                 │ (fixed / semantic)    │ hunk-ot metsző │
                 └────────┬────────────┘ │ chunk-ok       │
                          │                │ chunkolása     │
                          │                └────────┬───────┘
                          ▼                          ▼
                     ┌─────────┐              ┌─────────────┐
                     │Embedding │              │  Embedding   │
                     │ (OpenAI) │              │  (OpenAI)    │
                     └────┬─────┘              └──────┬───────┘
                          │                            │
                          ▼                            ▼
                  ┌──────────────────────────────────────────┐
                  │ tranzakció: régi (érintett) chunk-ok        │
                  │ törlése + újak INSERT; a hunk UTÁNI,        │
                  │ változatlan chunk-ok sorszáma UPDATE-tel     │
                  │ eltolva (B2, embed-hívás nélkül)             │
                  └───────────────────┬───────────────────────┘
                                      ▼
                  ┌──────────────────────────────────────┐
                  │ documents UPSERT: content_hash,        │
                  │ raw_text, last_indexed_at = now()      │
                  └──────────────────────────────────────┘
```
