import { getPrismaClient } from '../src/client/prisma-client';
import { seedGames } from '../src/seed/seed-games';

async function main(): Promise<void> {
  const prisma = getPrismaClient();

  await seedGames(prisma);
  await prisma.$disconnect();
}

main();
