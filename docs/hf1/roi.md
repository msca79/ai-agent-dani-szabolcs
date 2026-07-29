# ROI – Mennyit segít egy AI társasjáték-ajánló chatbot egy átlagos boltnak?

> A lenti számok **illusztratív példák**, nem mért adatok – egy tipikus kis/közepes méretű,
> online is jelenlévő társasjáték-bolt becsült forgalmi adatai alapján, a nagyságrend
> szemléltetésére. Konkrét boltnál a tényleges hatás ettől eltérhet.

## A probléma, amit a chatbot megold

Egy átlagos vásárló a webshopban gyakran nem tudja pontosan, *melyik* játékot vegye –
csak annyit tud, hogy "hányan lesznek", "mennyi idejük van", és "mennyit szánnak rá".
Enélkül a segítség nélkül két dolog történik:

- **Kosárelhagyás**: a vásárló bezárja az oldalt, mert túl sok a választás.
- **Rossz vásárlás**: rossz nehézségű/hosszúságú játékot vesz, csalódik, nem tér vissza.

A chatbot ezt a döntési súrlódást veszi le a vásárlóról, és emellett kiváltja az
eladók/ügyfélszolgálat ismétlődő, alacsony hozzáadott értékű válaszait
("mit ajánlasz 4 fős családnak, max 8000 Ft-ért?").

## Példaszámítás egy átlagos boltra

**Kiinduló feltételezések (illusztráció):**

| Mutató | Érték |
|---|---|
| Havi látogatószám a webshopban | 6 000 |
| Alap konverziós ráta (látogatóból vásárló) | 1,8% |
| Havi rendelésszám | 108 |
| Átlagos kosárérték | 14 000 Ft |
| Havi bevétel | 1 512 000 Ft |

**Chatbot hatása (két csatornán):**

1. **Konverzió javulása** – a bizonytalan vásárlók egy része célzott ajánlást kap
   ahelyett, hogy elpattanna. Becsült relatív javulás: **+25%**.
   → Konverziós ráta: 1,8% → 2,25% → **135 rendelés/hó** (+27 rendelés)

2. **Átlagos kosárérték növekedése** – a csomagajánlás ("családi estére 4 főre, 60
   perc alatt") és a "ha ez tetszett, ez is" logika miatt gyakoribb a több tételes vagy
   drágább vásárlás. Becsült növekedés: **+12%**.
   → Átlagos kosárérték: 14 000 Ft → **15 680 Ft**

**Eredmény:**

| | Chatbot nélkül | Chatbot-tal |
|---|---|---|
| Havi rendelésszám | 108 | 135 |
| Átlagos kosárérték | 14 000 Ft | 15 680 Ft |
| Havi bevétel | 1 512 000 Ft | **2 116 800 Ft** |

→ **+604 800 Ft/hó**, azaz nagyságrendileg **+7,3 millió Ft/év** többletbevétel.

## Ügyfélszolgálati idő megtakarítása

A társasjáték-ajánlás sok esetben ugyanazokat a kérdéseket ismétli ("mit ajánlasz
kezdőknek", "mi jó ajándék egy 10 évesnek 8000 Ft-ból"). Ha ebből a chatbot kivált egy
részt:

| Mutató | Érték |
|---|---|
| Ajánlással töltött eladói/ügyfélszolgálati idő | ~5 óra/hét |
| Chatbot által kiváltott arány | ~60% |
| Megtakarított idő | ~3 óra/hét |
| Becsült óradíj (bolti/eladói munkaidő) | 3 000 Ft/óra |
| Havi megtakarítás | ~39 000 Ft |
| Éves megtakarítás | ~468 000 Ft |

Ez az összeg önmagában kicsi, de gyakorlati hatása nagyobb: a felszabaduló idő
minőségibb, nehezebb ügyfélproblémákra (reklamáció, egyedi kérés) fordítható,
ami közvetve is a visszatérő vásárlók arányát növeli.

## Megtérülés

Egy ilyen chatbot (LLM API-hívások + üzemeltetés) becsült havi költsége egy kisbolt
méretében **20 000–50 000 Ft** nagyságrendben mozog (forgalomtól, modellválasztástól
függően).

A fenti példában a becsült havi nettó haszon (többletbevétel + megtakarítás,
üzemeltetési költség levonása után) **~600 000 Ft/hó** – vagyis a megtérülési idő
jellemzően **napokon–heteken belüli**, nem hónapokban mérendő.

## Nem pénzben mérhető hatások

- **0–24 elérhetőség** – a vásárló éjjel is kap ajánlást, nem csak nyitvatartási időben.
- **Alacsonyabb visszaküldési/csalódási arány** – jobban illeszkedő ajánlás miatt.
- **Adatgyűjtés** – a chatbot beszélgetésekből kiderül, milyen igényekre nincs elég
  készlet vagy termék, ami a beszerzést is informálja.

---

*A fenti számok kizárólag a koncepció nagyságrendjének szemléltetésére szolgálnak,
egy konkrét bolt esetén méréssel (A/B teszt, tényleges konverziós adatok) kell
validálni őket.*
