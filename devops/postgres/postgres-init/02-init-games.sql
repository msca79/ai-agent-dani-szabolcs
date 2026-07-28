CREATE TABLE games (
  id serial PRIMARY KEY,
  name text,
  bgg_id integer,
  category text,
  complexity text,
  players_min integer,
  players_max integer,
  playtime_min_minutes integer,
  playtime_max_minutes integer,
  min_age integer,
  price numeric,
  sale_price numeric,
  stock integer,
  rating numeric,
  reviews_count integer,
  description text
);

CREATE UNIQUE INDEX games_name_key ON games (name);

INSERT INTO games (
  name, bgg_id, category, complexity, players_min, players_max,
  playtime_min_minutes, playtime_max_minutes, min_age, price, sale_price,
  stock, rating, reviews_count, description
) VALUES
  ('Catan', 13, 'stratégiai', 'közepes', 3, 4, 60, 120, 10, 12000, 9990, 15, 7.2, 3500, 'Klasszikus nyersanyag-kereskedős stratégiai játék, amiben Catan szigetét építed be.'),
  ('7 Wonders', 68448, 'stratégiai', 'közepes', 3, 7, 30, 45, 10, 13500, NULL, 8, 7.7, 3600, 'Civilizációépítő kártyajáték, ahol kártyaszomszédodtól draftolsz és 3 korszakon át fejlődsz.'),
  ('Terraforming Mars', 167791, 'stratégiai', 'nehéz', 1, 5, 90, 180, 12, 18500, NULL, 6, 8.4, 4500, 'Mélyebb stratégiai játék, amiben vállalatod a Marsot teszi lakhatóvá — hosszabb, tartalmasabb parti.'),
  ('Wingspan', 266192, 'stratégiai', 'közepes', 1, 5, 40, 70, 10, 16000, 13990, 9, 8.1, 3700, 'Madarakat gyűjtő, gyönyörű illusztrációjú engine-building játék, könnyen tanulható mély rendszerrel.'),
  ('Splendor', 148228, 'stratégiai', 'közepes', 2, 4, 30, 30, 10, 8500, NULL, 16, 7.4, 3300, 'Ékszerkereskedő-szimulátor: drágakövekért fejlesztéseket veszel, hogy presztízspontokat gyűjts.'),
  ('Carcassonne', 822, 'család', 'könnyű', 2, 5, 30, 45, 7, 9000, NULL, 20, 7.4, 4200, 'Lapkalerakós klasszikus, amiben várost, utat és kolostort építve pontozol — gyors tanulási görbével.'),
  ('Ticket to Ride', 9209, 'család', 'könnyű', 2, 5, 30, 60, 8, 12000, NULL, 14, 7.4, 4100, 'Vasútvonalakat építesz kontinensen át; egyszerű szabályok, de izgalmas útvonal-versengés.'),
  ('Colt Express', 158899, 'család', 'közepes', 2, 6, 30, 40, 10, 11500, NULL, 7, 7.5, 1900, 'Vonatrablós programozós játék papír-vasút díszlettel; kaotikus, vicces, taktikus fordulókkal.'),
  ('Kingdomino', 204583, 'család', 'közepes', 2, 4, 15, 20, 8, 6500, NULL, 22, 7.3, 2200, 'Dominó-elven épülő királyságépítő; gyors parti, de a lapkaválasztás sorrendje meglepően taktikus.'),
  ('Azul', 230802, 'absztrakt', 'könnyű', 2, 4, 30, 45, 8, 11000, 8990, 12, 7.8, 3900, 'Csempemintázó absztrakt játék: portugál azulejo csempékből raksz ki mintát a palotádon.'),
  ('Patchwork', 163412, 'absztrakt', 'könnyű', 2, 2, 15, 30, 8, 8000, 6990, 13, 7.7, 2400, 'Kétszemélyes patchwork-varrás: tetris-szerű darabokból rakod ki a legjobban kitöltött takarót.'),
  ('Santorini', 194655, 'absztrakt', 'közepes', 2, 4, 20, 30, 8, 9500, NULL, 10, 7.3, 1700, 'Építkezős absztrakt játék egyedi isteni képességekkel; sakkszerű mélység, egyszerű alapszabályokkal.'),
  ('Quoridor', 624, 'absztrakt', 'könnyű', 2, 4, 15, 20, 8, 6500, NULL, 16, 6.6, 1100, 'Falépítős pályajáték: érj el elsőként a másik oldalra, miközben az ellenfeled útját blokkolod.'),
  ('Dixit', 39856, 'parti', 'könnyű', 3, 6, 30, 45, 8, 9500, NULL, 18, 7.3, 2900, 'Asszociációs kártyajáték gyönyörű, szürreális illusztrációkkal; a lényeg a jó félrevezetés.'),
  ('Codenames', 178900, 'parti', 'könnyű', 2, 8, 15, 30, 14, 7500, NULL, 25, 7.6, 3800, 'Csapatos szóasszociációs parti játék: egy szóval kell eltaláltatni több mezőt is egyszerre.'),
  ('Dobble', 63268, 'parti', 'könnyű', 2, 8, 15, 15, 6, 4500, NULL, 30, 6.9, 2500, 'Gyors reakciójáték: minden két kártyán pontosan egy közös szimbólum van, azt kell megtalálni.'),
  ('Bang!', 3955, 'kártya', 'közepes', 4, 7, 30, 45, 10, 7000, NULL, 11, 7, 2100, 'Vadnyugati szerepekre épülő bluffolós kártyajáték: seriff, zsiványok, aljas és a renegát csapnak össze.'),
  ('Sushi Go!', 133473, 'kártya', 'könnyű', 2, 5, 15, 15, 8, 4500, NULL, 21, 7.1, 2000, 'Gyors draftolós kártyajáték: forgó kézből válogass össze egy nyerő sushi-menüt.'),
  ('Pandemic', 30549, 'kooperatív', 'közepes', 2, 4, 45, 60, 10, 10500, 8990, 10, 7.6, 4300, 'A klasszikus kooperatív játék: csapatként kell megfékezni négy világjárványt, mielőtt elszabadulnak.'),
  ('Forbidden Island', 65244, 'kooperatív', 'könnyű', 2, 4, 30, 30, 10, 7500, NULL, 12, 7.1, 1500, 'Könnyed belépő a kooperatív játékokba: süllyedő szigetről kell kincseket menteni csapatban.'),
  ('Hanabi', 98778, 'kooperatív', 'könnyű', 2, 5, 25, 25, 8, 4500, 3990, 15, 7.1, 1900, 'Különleges kooperatív kártyajáték: saját lapjaidat nem látod, csak társaid jelzéseiből következtetsz.'),
  ('Camel Up', 153938, 'dobókockás', 'közepes', 2, 8, 30, 45, 8, 9000, 7490, 8, 7.3, 1400, 'Tevefogadós party-game kockadobással: kire fogadsz, melyik teve ér célba elsőként a piramison át.');
