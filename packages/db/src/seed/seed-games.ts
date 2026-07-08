import type { PrismaClient } from '../../generated/prisma/client';
import { gamesSeedData } from './games-seed-data';

export async function seedGames(prisma: PrismaClient): Promise<void> {
  for (const game of gamesSeedData) {
    await prisma.game.upsert({
      where: { name: game.name },
      create: game,
      update: game,
    });
  }
}
