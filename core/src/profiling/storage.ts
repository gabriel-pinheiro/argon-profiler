import { AsyncLocalStorage } from 'node:async_hooks';
import { ContinuationTracker } from './continuation-tracker';

export const als = new AsyncLocalStorage<ContinuationTracker>();
