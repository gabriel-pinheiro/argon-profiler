import { performance } from 'node:perf_hooks';

export type ContinuationMetrics<T> = {
    flowName: string;
    totalEventLoopTime: number;
    totalExecutionTime: number;
    resultPromise: Promise<T>;
};

export class ContinuationTracker {
    private totalEventLoopTime = 0;
    private totalExecutionTime = 0;

    private flowStart = 0;
    private taskStart = 0;

    constructor(public flowName?: string) {}

    markFlowStart() {
        this.flowStart = performance.now();
    }

    markFlowEnd() {
        this.totalExecutionTime = performance.now() - this.flowStart;
    }

    markTaskStart() {
        this.taskStart = performance.now();
    }

    markTaskEnd() {
        this.totalEventLoopTime += performance.now() - this.taskStart;
    }

    getMetrics<T>(resultPromise: Promise<T>): ContinuationMetrics<T> {
        return {
            flowName: this.flowName ?? '<unnamed flow>',
            totalEventLoopTime: this.totalEventLoopTime,
            totalExecutionTime: this.totalExecutionTime,
            resultPromise,
        };
    }

    static getEmptyMetrics<T>(
        resultPromise: Promise<T>,
    ): ContinuationMetrics<T> {
        return {
            flowName: '<profiling is disabled>',
            totalEventLoopTime: 0,
            totalExecutionTime: 0,
            resultPromise,
        };
    }
}
