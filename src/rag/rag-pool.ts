import { Pool } from 'pg';

let ragPool: Pool | undefined;

// Külön kapcsolat, külön (szűk jogú, csak SELECT/INSERT/DELETE a knowledge
// táblán) Postgres role-lal — lásd
// devops/postgres/postgres-init/05-rag-role.sql. Nem ugyanaz, mint a
// run-sql olvasó vagy az upsertProduct író kapcsolata.
export function getRagPool(): Pick<Pool, 'query'> {
  if (!ragPool) {
    ragPool = new Pool({ connectionString: process.env['DATABASE_URL_RAG'] });
  }

  return ragPool;
}
