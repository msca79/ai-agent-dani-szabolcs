import { describe, expect, it } from 'vitest';
import { gamesSeedData, type GameCategory, type GameComplexity } from './games-seed-data';

const VALID_CATEGORIES: GameCategory[] = [
  'parti',
  'stratégiai',
  'család',
  'kooperatív',
  'kártya',
  'absztrakt',
  'dobókockás',
  'roguelike',
];

const VALID_COMPLEXITIES: GameComplexity[] = ['könnyű', 'közepes', 'nehéz'];

describe('gamesSeedData', () => {
  it('should contain between 30 and 40 games', () => {
    expect(gamesSeedData.length).toBeGreaterThanOrEqual(30);
    expect(gamesSeedData.length).toBeLessThanOrEqual(40);
  });

  it('should only use valid category values, each with at least 3 games', () => {
    const counts = new Map<string, number>();

    for (const game of gamesSeedData) {
      expect(VALID_CATEGORIES).toContain(game.category);
      counts.set(game.category, (counts.get(game.category) ?? 0) + 1);
    }

    for (const category of VALID_CATEGORIES) {
      expect(counts.get(category) ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  it('should only use valid complexity values', () => {
    for (const game of gamesSeedData) {
      expect(VALID_COMPLEXITIES).toContain(game.complexity);
    }
  });

  it('should have playersMin <= playersMax for every game', () => {
    for (const game of gamesSeedData) {
      expect(game.playersMin).toBeLessThanOrEqual(game.playersMax);
    }
  });

  it('should have playtimeMinMinutes <= playtimeMaxMinutes for every game', () => {
    for (const game of gamesSeedData) {
      expect(game.playtimeMinMinutes).toBeLessThanOrEqual(game.playtimeMaxMinutes);
    }
  });

  it('should not contain duplicate names', () => {
    const names = gamesSeedData.map((game) => game.name);

    expect(new Set(names).size).toEqual(names.length);
  });
});
