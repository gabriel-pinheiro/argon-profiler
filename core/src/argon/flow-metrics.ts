import { ContinuationMetrics } from '../profiling/continuation-tracker';

export type SerializedFlowMetrics = {
    name: string;
    totalExecutionTime: number;
    totalEventLoopTime: number;
    executions: number;

    averageExecutionTime: number;
    averageEventLoopTime: number;
};

export class FlowMetrics {
    private totalExecutionTime = 0;
    private totalEventLoopTime = 0;
    private executions = 0;

    constructor(private readonly name: string) {}

    registerExecution(metrics: ContinuationMetrics<unknown>) {
        this.totalExecutionTime += metrics.totalExecutionTime;
        this.totalEventLoopTime += metrics.totalEventLoopTime;
        this.executions++;
    }

    serialize(): SerializedFlowMetrics {
        return {
            name: this.name,
            totalExecutionTime: this.totalExecutionTime,
            totalEventLoopTime: this.totalEventLoopTime,
            executions: this.executions,

            averageExecutionTime: this.totalExecutionTime / this.executions,
            averageEventLoopTime: this.totalEventLoopTime / this.executions,
        };
    }
}
