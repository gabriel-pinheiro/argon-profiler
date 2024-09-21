import { releaseEventLoop } from '../timing';
import {
    ContinuationMetrics,
    ContinuationTracker,
} from './continuation-tracker';
import { als } from './storage';
import { taskMetricsHook } from './task-metrics-hook';

export function runWithProfiling<T>(
    fn: () => T | Promise<T>,
): Promise<ContinuationMetrics<T>> {
    const tracker = new ContinuationTracker();

    return als.run(tracker, async () => {
        // Releasing the event loop because the "start" hook for the
        // current task has already been emitted without the ALS tracker
        // so its time wouldn't be counted. Now a new task is being
        // created with the ALS tracker already set.
        await releaseEventLoop();

        tracker.markFlowStart();

        try {
            const result = await fn();
            // No need to release the event loop here because promise
            // resolutions happen in the next tick.
            tracker.markFlowEnd();

            return tracker.getMetrics(Promise.resolve(result));
        } catch (e) {
            // Here we need to release the event loop because even though promise
            // rejections happen in the next tick, the `fn` function might be
            // synchronous and throw instead of rejecting.
            // That would me the "end" hook be emmited after we return the metrics
            // below so the last tick wouldn't be counted.
            await releaseEventLoop();

            tracker.markFlowEnd();
            return tracker.getMetrics(Promise.reject(e));
        }
    });
}

export function enableProfiling() {
    taskMetricsHook.enable();
}

export function disableProfiling() {
    taskMetricsHook.disable();
}
