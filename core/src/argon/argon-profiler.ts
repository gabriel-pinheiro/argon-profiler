import { performance } from 'perf_hooks';
import { ContinuationMetrics } from '../profiling/continuation-tracker';
import {
    disableProfiling,
    enableProfiling,
    getExecutionMetrics,
} from '../profiling/flow-control';
import { FlowMetrics, Statistics } from './flow-metrics';

const allMetrics: Map<string, FlowMetrics> = new Map();
let eventLoopUsageStart = 0;
let eventLoopUsageEnd = 0;
let isProfilingEnabled = false;

export async function runWithProfiling<T>(
    flowName: string,
    fn: () => T | Promise<T>,
): Promise<T> {
    const metrics = await getExecutionMetrics(fn, { flowName });
    registerFlowExecution(metrics);
    return await metrics.resultPromise;
}

export function beginProfiling() {
    enableProfiling();
    allMetrics.clear();
    isProfilingEnabled = true;
    eventLoopUsageStart = performance.eventLoopUtilization().active;
}

export function endProfiling() {
    disableProfiling();
    isProfilingEnabled = false;
    eventLoopUsageEnd = performance.eventLoopUtilization().active;
}

export function getStatistics(): Statistics {
    const globalEventLoopTime = getGlobalEventLoopTime();
    const flowMetrics = Array.from(allMetrics.values()).map((metrics) =>
        metrics.serialize(globalEventLoopTime),
    );
    const trackedEventLoopTime = flowMetrics.reduce(
        (sum, stats) => sum + stats.totalEventLoopTime,
        0,
    );
    const untrackedEventLoopTime = globalEventLoopTime - trackedEventLoopTime;
    const untrackedEventLoopUsage =
        untrackedEventLoopTime / globalEventLoopTime;

    return {
        globalEventLoopTime,
        untrackedEventLoopTime,
        untrackedEventLoopUsage,
        flowStats: flowMetrics,
    };
}

function getGlobalEventLoopTime() {
    if (!isProfilingEnabled) {
        return eventLoopUsageEnd - eventLoopUsageStart;
    }

    return performance.eventLoopUtilization().active - eventLoopUsageStart;
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
