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
        const { resultPromise } = await runWithProfiling(() => 42);

        expect(await resultPromise).toBe(42);
    });

    it('should return correct value with async functions', async () => {
        const { resultPromise } = await runWithProfiling(async () => 42);

        expect(await resultPromise).toBe(42);
    });

    it('should return correct total execution time with async functions', async () => {
        const metrics = await runWithProfiling(async () => {
            await asyncSleep(100);
            return 42;
        });

        expect(metrics.totalExecutionTime).toBeGreaterThan(100 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(100 + TOLERANCE);
        expect(await metrics.resultPromise).toBe(42);
    });

    it('should return correct total execution time with sync functions', async () => {
        const metrics = await runWithProfiling(() => {
            syncSleep(100);
            return 42;
        });

        expect(metrics.totalExecutionTime).toBeGreaterThan(100 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(100 + TOLERANCE);
        expect(await metrics.resultPromise).toBe(42);
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
        expect(await metrics.resultPromise).toBe(42);
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
        expect(await metrics.resultPromise).toBe(42);
    });

    it('should not measure eventLoop with disabled profiling', async () => {
        const metrics = await runWithProfiling(() => {
            syncSleep(20);
            return 42;
        });

        expect(metrics.totalExecutionTime).toBeGreaterThan(20 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(20 + TOLERANCE);
        expect(metrics.totalEventLoopTime).toBe(0);
        expect(await metrics.resultPromise).toBe(42);
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
        expect(await metrics.resultPromise).toBe(42);
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
        expect(await metrics.resultPromise).toBe(42);
    });

    it('should support sync throwing', async () => {
        enableProfiling();
        const metrics = await runWithProfiling(() => {
            syncSleep(20);
            throw new Error('error');
        });

        expect(metrics.totalExecutionTime).toBeGreaterThan(20 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(20 + TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeGreaterThan(20 - TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeLessThan(20 + TOLERANCE);
        expect(metrics.resultPromise).rejects.toThrow('error');
    });

    it('should support async throwing', async () => {
        enableProfiling();
        const metrics = await runWithProfiling(async () => {
            syncSleep(10);
            await asyncSleep(20);
            syncSleep(40);
            await asyncSleep(80);
            syncSleep(160);
            throw new Error('error');
        });

        expect(metrics.totalExecutionTime).toBeGreaterThan(310 - TOLERANCE);
        expect(metrics.totalExecutionTime).toBeLessThan(310 + TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeGreaterThan(210 - TOLERANCE);
        expect(metrics.totalEventLoopTime).toBeLessThan(210 + TOLERANCE);
        expect(metrics.resultPromise).rejects.toThrow('error');
    });

    it('should support parallell profiling', async () => {
        enableProfiling();
        const metrics1Promise = runWithProfiling(async () => {
            await asyncSleep(10);
            syncSleep(20);
            await asyncSleep(50);
            syncSleep(30);
            return 41;
        });

        const metrics2Promise = runWithProfiling(async () => {
            await asyncSleep(10);
            syncSleep(20); // This will be queued and shouldn't affect the event loop time
            await asyncSleep(100);
            syncSleep(60);
            return 42;
        });

        const [metrics1, metrics2] = await Promise.all([
            metrics1Promise,
            metrics2Promise,
        ]);

        expect(metrics1.totalEventLoopTime).toBeGreaterThan(50 - TOLERANCE);
        expect(metrics1.totalEventLoopTime).toBeLessThan(50 + TOLERANCE);
        expect(await metrics1.resultPromise).toBe(41);

        expect(metrics2.totalEventLoopTime).toBeGreaterThan(80 - TOLERANCE);
        expect(metrics2.totalEventLoopTime).toBeLessThan(80 + TOLERANCE);
        expect(await metrics2.resultPromise).toBe(42);
    });
});
