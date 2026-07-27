import { Pool } from 'pg';

let readOnlyPool: Pool | undefined;

export function getReadOnlyPool(): Pick<Pool, 'query'> {
  if (!readOnlyPool) {
    readOnlyPool = new Pool({ connectionString: process.env['DATABASE_URL_READONLY'] });
  }

  return readOnlyPool;
}
