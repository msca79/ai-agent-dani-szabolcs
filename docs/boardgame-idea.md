adj ötletet. egy agentic tanfolyamon veszek részt. az előadó egy szobanövény ajánló rendszert készít ahol agentic működésben egy webshop szerű cli alkalmazás van jelenleg. Lehet kérdezni a növényekről, amik adatbázisban vannak, lehet lekérdezni büdzsét és az alapján növény palettát összeállítani. Pár tool és pár mcp kell beépíteni a házi feladatban. 

Én egy társasjáték ajánlót készítenék, játékosszám, játékidő, nehézség, büdzsé alapján játékválasztás. Kiegészítve saját webshop készlettel, vagy használt termék vásárlással (vinted, marketplace).

Példa promptok:
- "3-an játszanánk maximum 30 percet valami könnyen tanulható parti játékot"
- "3-an játszanánk valami új stratégiai pár órás játékkal, amit még nem ismerünk"
- "keresek ajándékot egy 10 éves gyereknek, max 8000 Ft"
- for fun: "milyen nasi javasolt mellé"

Tool-ok (belső logika, DB-hez kötve):
- search_games(players, playtime, complexity, genre, age) – szűrt keresés
- similar_games(name) – "ha ez tetszett, ez is" ajánló
- recommend_bundle(criteria) – pl. "családi estére 4 főre, 60 perc alatt" csomag-logika
- compare_games(names) – összehasonlító mátrix
- get_stock(name) – készletellenőrzés

MCP-k (külső integráció):
- BoardGameGeek API – ez a natural fit: valós értékelések, komplexitás, játékosszám-ajánlás, ezzel a "adatbázis" rész hiteles külső adatot kap, nem csak kitalált mock adatot
- Youtube API - videók a játékmenetről, inkább csak youtube url összeállítása (az API hívás körülményessége miatt később implementálható)
- Használt termék keresés - itt is inkább csak paraméterezett url-t adna vissza, amire rányithat a böngészőben
MCP 2.0: 
- Játékszabály API - játékszabály megszerzése pdf-ben, több nyelven (erre nincs api... kihagyható)
- Discord/Slack MCP – meghívó a baráti körnek, RSVP-k gyűjtése ("ki ér rá szombaton?")
