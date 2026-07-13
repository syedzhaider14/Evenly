import * as Crypto from 'expo-crypto';

import type { IdGenerator } from './runtime';

/** RFC 4122 v4 identifiers from the platform's secure random source. */
export const uuidGenerator: IdGenerator = {
  next: () => Crypto.randomUUID(),
};
