-- Csak első konténer-indításkor fut le (üres data volume-nál).
-- Ha a konténer már létezett, futtasd újra kézzel psql-lel, vagy: docker compose down -v && docker compose up -d

CREATE EXTENSION IF NOT EXISTS vector;

-- A RAG (Retrieval-Augmented Generation) tudásbázis: szabálykönyv-darabok
-- (chunk) és azok embeddingjei. A rag-loader script (src/rag) minden
-- futáskor törli és újratölti.
CREATE TABLE knowledge (
  id serial PRIMARY KEY,
  file_name text NOT NULL,
  start_line integer NOT NULL,
  end_line integer NOT NULL,
  chunk_text text NOT NULL,
  chunking_strategy text NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX knowledge_embedding_idx ON knowledge USING hnsw (embedding vector_cosine_ops);

-- A boardgame_ro role a 01-readonly-role.sql-ben beállított
-- ALTER DEFAULT PRIVILEGES miatt automatikusan SELECT jogot kap erre a
-- táblára is — nincs itt szükség külön GRANT-ra.
