-- Csak első konténer-indításkor fut le (üres data volume-nál).
-- A knowledge tábla ekkor már létezik (04-init-knowledge.sql előbb fut le).

-- A rag-loader script (src/rag/load-knowledge) role-ja: kizárólag a
-- knowledge táblát éri el, ott is csak SELECT/INSERT/DELETE — a games
-- táblához nincs hozzáférése, DDL-t nem futtathat. Külön role a
-- boardgame_rw-től, mert az szándékosan nem kap DELETE-et sehol
-- (least-privilege, lásd 03-readwrite-role.sql).
CREATE ROLE boardgame_rag WITH LOGIN PASSWORD 'boardgame_rag_dev_only';
GRANT CONNECT ON DATABASE boardgame TO boardgame_rag;
GRANT USAGE ON SCHEMA public TO boardgame_rag;
GRANT SELECT, INSERT, DELETE ON knowledge TO boardgame_rag;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO boardgame_rag;
