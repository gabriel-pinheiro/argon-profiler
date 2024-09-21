import { ContinuationMetrics } from '../profiling/continuation-tracker';
import {
    disableProfiling,
    enableProfiling,
    runWithProfiling,
} from '../profiling/flow-control';
import { FlowMetrics, SerializedFlowMetrics } from './flow-metrics';

const allMetrics: Map<string, FlowMetrics> = new Map();
let isProfilingEnabled = false;

export async function recordFlowMetrics<T>(
    flowName: string,
    fn: () => T | Promise<T>,
): Promise<T> {
    const metrics = await runWithProfiling(fn, { flowName });
    registerFlowExecution(metrics);
    return await metrics.resultPromise;
}

export function beginProfiling() {
    enableProfiling();
    allMetrics.clear();
    isProfilingEnabled = true;
}

export function endProfiling(): SerializedFlowMetrics[] {
    const flowMetrics = Array.from(allMetrics.values()).map((metrics) =>
        metrics.serialize(),
    );

    disableProfiling();
    allMetrics.clear();
    isProfilingEnabled = false;
    return flowMetrics;
}

function registerFlowExecution(metrics: ContinuationMetrics<unknown>) {
    if (!isProfilingEnabled) {
        return;
    }

    const name = metrics.flowName;
    let flowMetrics = allMetrics.get(name);
    if (!flowMetrics) {
        flowMetrics = new FlowMetrics(name);
        allMetrics.set(name, flowMetrics);
    }

    flowMetrics.registerExecution(metrics);
}
