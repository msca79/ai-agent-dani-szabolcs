-- Csak első konténer-indításkor fut le (üres data volume-nál).
-- A games tábla ekkor már létezik (02-init-games.sql előbb fut le), ezért itt
-- explicit GRANT-ot adhatunk rá, nem kell ALTER DEFAULT PRIVILEGES trükk.

CREATE ROLE boardgame_rw WITH LOGIN PASSWORD 'boardgame_rw_dev_only';
GRANT CONNECT ON DATABASE boardgame TO boardgame_rw;
GRANT USAGE ON SCHEMA public TO boardgame_rw;

-- Csak INSERT/UPDATE a games táblán — se DELETE, se DDL, se más tábla.
-- A SELECT is kell, mert az upsertProduct tool előbb megnézi, létezik-e már
-- a sor (insert vagy update lesz-e), ugyanazon a kapcsolaton.
GRANT SELECT, INSERT, UPDATE ON games TO boardgame_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO boardgame_rw;
