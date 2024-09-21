import { performance } from 'node:perf_hooks';

export type ContinuationMetrics<T> = {
    totalEventLoopTime: number;
    totalExecutionTime: number;
    resultPromise: Promise<T>;
};

export class ContinuationTracker {
    private totalEventLoopTime = 0;
    private totalExecutionTime = 0;

    private flowStart = 0;
    private taskStart = 0;

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
            totalEventLoopTime: this.totalEventLoopTime,
            totalExecutionTime: this.totalExecutionTime,
            resultPromise,
        };
    }

    static getEmptyMetrics<T>(
        resultPromise: Promise<T>,
    ): ContinuationMetrics<T> {
        return {
            totalEventLoopTime: 0,
            totalExecutionTime: 0,
            resultPromise,
        };
    }
}
