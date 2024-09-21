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
        await releaseEventLoop();

        tracker.markFlowStart();
        const result = await fn(); // TODO support rejection
        tracker.markFlowEnd();

        return tracker.getMetrics(result);
    });
}

export function enableProfiling() {
    taskMetricsHook.enable();
}

export function disableProfiling() {
    taskMetricsHook.disable();
}
