export interface Typewriter {
  push(chunk: string): void;
  finish(): void;
}

const DEFAULT_INTERVAL_MS = 20;
const DEFAULT_CHARS_PER_TICK = 3;

// A hálózati chunkok mérete/érkezési üteme egyenetlen — ez döcögősnek tűnik a
// felhasználónak. Ez a modul lecsatolja a megjelenítés ütemét az érkezés
// ütemétől: a beérkező szöveget egy pufferbe teszi, és fix időzítéssel,
// egyenletesen "gépeli ki" — a beérkezés sebességétől függetlenül.
export function createTypewriter(
  onUpdate: (revealed: string) => void,
  intervalMs = DEFAULT_INTERVAL_MS,
  charsPerTick = DEFAULT_CHARS_PER_TICK,
): Typewriter {
  let buffer = '';
  let revealed = '';
  let timer: ReturnType<typeof setInterval> | undefined;

  function stop(): void {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  }

  function tick(): void {
    if (buffer.length === 0) {
      stop();
      return;
    }

    revealed += buffer.slice(0, charsPerTick);
    buffer = buffer.slice(charsPerTick);
    onUpdate(revealed);
  }

  return {
    push(chunk: string): void {
      buffer += chunk;
      if (timer === undefined) {
        timer = setInterval(tick, intervalMs);
      }
    },

    finish(): void {
      stop();
      if (buffer.length > 0) {
        revealed += buffer;
        buffer = '';
        onUpdate(revealed);
      }
    },
  };
}
