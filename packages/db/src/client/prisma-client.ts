import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

let prismaClient: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
    prismaClient = new PrismaClient({ adapter });
  }

  return prismaClient;
}
