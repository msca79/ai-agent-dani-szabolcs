-- Csak első konténer-indításkor fut le (üres data volume-nál).
-- Ha a konténer már létezett, futtasd újra kézzel psql-lel, vagy: docker compose down -v && docker compose up -d

CREATE ROLE boardgame_ro WITH LOGIN PASSWORD 'boardgame_ro_dev_only';
GRANT CONNECT ON DATABASE boardgame TO boardgame_ro;
GRANT USAGE ON SCHEMA public TO boardgame_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO boardgame_ro;

-- A `games` tábla ekkor még nem létezik (a Prisma-migráció ez után fut le először),
-- ezért a jövőbeli táblákra is előre garantáljuk a SELECT jogot.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO boardgame_ro;
