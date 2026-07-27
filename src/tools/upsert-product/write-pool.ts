import { Pool } from 'pg';

let writePool: Pool | undefined;

// Külön kapcsolat, külön (szűk jogú, csak INSERT/UPDATE a games táblán)
// Postgres role-lal — lásd devops/postgres/postgres-init/03-readwrite-role.sql.
// Nem ugyanaz, mint a run-sql olvasó kapcsolata.
export function getWritePool(): Pick<Pool, 'query'> {
  if (!writePool) {
    writePool = new Pool({ connectionString: process.env['DATABASE_URL_WRITE'] });
  }

  return writePool;
}
