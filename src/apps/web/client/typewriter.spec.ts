import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTypewriter } from './typewriter';

describe('createTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reveal pushed text gradually over multiple ticks, not all at once', () => {
    const updates: string[] = [];
    const typewriter = createTypewriter((revealed) => updates.push(revealed), 10, 2);

    typewriter.push('Ajánlom');

    expect(updates).toEqual([]);

    vi.advanceTimersByTime(10);
    expect(updates).toEqual(['Aj']);

    vi.advanceTimersByTime(10);
    expect(updates).toEqual(['Aj', 'Aján']);

    vi.advanceTimersByTime(30);
    expect(updates.at(-1)).toEqual('Ajánlom');
  });

  it('should keep revealing newly pushed text appended after what is already revealed', () => {
    const updates: string[] = [];
    const typewriter = createTypewriter((revealed) => updates.push(revealed), 10, 10);

    typewriter.push('Ajánlom ');
    vi.advanceTimersByTime(10);
    expect(updates.at(-1)).toEqual('Ajánlom ');

    typewriter.push('a Dobble-t.');
    vi.advanceTimersByTime(20);
    expect(updates.at(-1)).toEqual('Ajánlom a Dobble-t.');
  });

  it('should immediately reveal any remaining buffered text on finish, without waiting for more ticks', () => {
    const updates: string[] = [];
    const typewriter = createTypewriter((revealed) => updates.push(revealed), 10, 1);

    typewriter.push('Dobble');
    typewriter.finish();

    expect(updates.at(-1)).toEqual('Dobble');
  });

  it('should stop ticking once the buffer is drained', () => {
    const updates: string[] = [];
    const typewriter = createTypewriter((revealed) => updates.push(revealed), 10, 100);

    typewriter.push('ok');
    vi.advanceTimersByTime(10);
    const countAfterDrain = updates.length;

    vi.advanceTimersByTime(1000);
    expect(updates.length).toEqual(countAfterDrain);
  });
});
