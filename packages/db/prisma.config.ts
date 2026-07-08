import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Egyetlen gyökér .env a forrás (konvenció); a `pnpm --filter @boardgame/db exec prisma ...`
// ezt a fájlt packages/db cwd-ből futtatja, ezért itt explicit útvonalról töltjük be.
config({ path: resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
