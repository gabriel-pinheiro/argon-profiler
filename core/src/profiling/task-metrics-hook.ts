import { createHook } from 'node:async_hooks';
import { als } from './storage';

export const taskMetricsHook = createHook({
    before() {
        const tracker = als.getStore();
        if (!tracker) {
            return;
        }

        tracker.markTaskStart();
    },

    after() {
        const tracker = als.getStore();
        if (!tracker) {
            return;
        }

        tracker.markTaskEnd();
    },
});
