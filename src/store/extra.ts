import type { Repositories } from '@/data/repositories';
import type { Clock, IdGenerator } from '@/data/runtime';

/**
 * Dependencies handed to every thunk through Redux Toolkit's `extraArgument`. Injecting them
 * (instead of importing singletons) is what makes the thunks testable with fakes.
 */
export interface ThunkExtra {
  repos: Repositories;
  clock: Clock;
  ids: IdGenerator;
}
