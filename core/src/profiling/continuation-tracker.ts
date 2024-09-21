import { performance } from 'node:perf_hooks';

export type ContinuationMetrics<T> = {
    totalEventLoopTime: number;
    totalExecutionTime: number;
    result: T;
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

    getMetrics<T>(result: T): ContinuationMetrics<T> {
        return {
            totalEventLoopTime: this.totalEventLoopTime,
            totalExecutionTime: this.totalExecutionTime,
            result,
        };
    }
}
