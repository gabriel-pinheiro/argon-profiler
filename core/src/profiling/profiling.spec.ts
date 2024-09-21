import {
    disableProfiling,
    enableProfiling,
    runWithProfiling,
} from './flow-control';
import { syncSleep, asyncSleep } from '../timing';

const TOLERANCE = 5;

describe('Profiling', () => {
    beforeEach(() => {
        disableProfiling();
    });

    it('should return correct value with sync functions', async () => {
        const { result } = await runWithProfiling(() => 42);

        expect(result).toBe(42);
    });

    it('should return correct value with async functions', async () => {
        const { result } = await runWithProfiling(async () => 42);

        expect(result).toBe(42);
    });

    it('should return correct total execution time with async functions', async () => {
        const metrics = await runWithProfiling(async () => {
            await asyncSleep(100);
            return 42;
        });

        expect(metrics.totalExecutionTime).toBeGreaterThan(100 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(100 + TOLERANCE);
        expect(metrics.result).toBe(42);
    });

    it('should return correct total execution time with sync functions', async () => {
        const metrics = await runWithProfiling(() => {
            syncSleep(100);
            return 42;
        });

        expect(metrics.totalExecutionTime).toBeGreaterThan(100 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(100 + TOLERANCE);
        expect(metrics.result).toBe(42);
    });

    it('should return correct event loop time with async functions', async () => {
        enableProfiling();
        const metrics = await runWithProfiling(async () => {
            syncSleep(10);
            await asyncSleep(20);
            syncSleep(40);
            await asyncSleep(80);
            syncSleep(160);
            return 42;
        });

        expect(metrics.totalExecutionTime).toBeGreaterThan(310 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(310 + TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeGreaterThan(210 - TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeLessThan(210 + TOLERANCE);
        expect(metrics.result).toBe(42);
    });

    it('should return correct event loop time with sync functions', async () => {
        enableProfiling();
        const metrics = await runWithProfiling(() => {
            syncSleep(20);
            return 42;
        });

        expect(metrics.totalExecutionTime).toBeGreaterThan(20 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(20 + TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeGreaterThan(20 - TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeLessThan(20 + TOLERANCE);
        expect(metrics.result).toBe(42);
    });

    it('should not measure eventLoop with disabled profiling', async () => {
        const metrics = await runWithProfiling(() => {
            syncSleep(20);
            return 42;
        });

        expect(metrics.totalExecutionTime).toBeGreaterThan(20 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(20 + TOLERANCE);
        expect(metrics.totalEventLoopTime).toBe(0);
        expect(metrics.result).toBe(42);
    });

    it('should support macrotasks', async () => {
        enableProfiling();
        const metrics = await runWithProfiling(
            () =>
                new Promise((r) => {
                    setImmediate(() => {
                        syncSleep(20);
                        r(42);
                    });
                }),
        );

        expect(metrics.totalExecutionTime).toBeGreaterThan(20 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(20 + TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeGreaterThan(20 - TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeLessThan(20 + TOLERANCE);
        expect(metrics.result).toBe(42);
    });

    it('should support microtasks', async () => {
        enableProfiling();
        const metrics = await runWithProfiling(
            () =>
                new Promise((r) => {
                    process.nextTick(() => {
                        syncSleep(20);
                        r(42);
                    });
                }),
        );

        expect(metrics.totalExecutionTime).toBeGreaterThan(20 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(20 + TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeGreaterThan(20 - TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeLessThan(20 + TOLERANCE);
        expect(metrics.result).toBe(42);
    });
});
