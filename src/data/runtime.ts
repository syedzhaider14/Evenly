export interface Clock {
  now(): number;
}

export interface IdGenerator {
  next(): string;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

/** Deterministic clock for tests and previews. Advances by `step` ms on every read. */
export function fixedClock(start: number, step = 0): Clock {
  let current = start;
  return {
    now: () => {
      const value = current;
      current += step;
      return value;
    },
  };
}

/** Deterministic ids for tests and previews: `id-1`, `id-2`, … */
export function sequentialIds(prefix = 'id'): IdGenerator {
  let counter = 0;
  return {
    next: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}
