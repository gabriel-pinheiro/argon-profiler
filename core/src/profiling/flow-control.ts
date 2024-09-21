import { releaseEventLoop } from '../timing';
import {
    ContinuationMetrics,
    ContinuationTracker,
} from './continuation-tracker';
import { als } from './storage';
import { taskMetricsHook } from './task-metrics-hook';

let isProfilingEnabled = false;

async function runWithoutProfiling<T>(
    fn: () => T | Promise<T>,
): Promise<ContinuationMetrics<T>> {
    try {
        const result = await fn();
        return ContinuationTracker.getEmptyMetrics(Promise.resolve(result));
    } catch (e) {
        return ContinuationTracker.getEmptyMetrics(Promise.reject(e));
    }
}

export function runWithProfiling<T>(
    fn: () => T | Promise<T>,
): Promise<ContinuationMetrics<T>> {
    if (!isProfilingEnabled) {
        return runWithoutProfiling(fn);
    }

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
            // That would make the "end" hook be emmited after we return the metrics
            // below so the last task wouldn't be counted.
            await releaseEventLoop();

            tracker.markFlowEnd();
            return tracker.getMetrics(Promise.reject(e));
        }
    });
}

export function enableProfiling() {
    taskMetricsHook.enable();
    isProfilingEnabled = true;
}

export function disableProfiling() {
    taskMetricsHook.disable();
    als.disable();
    isProfilingEnabled = false;
}
