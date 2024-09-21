import {
    disableProfiling,
    enableProfiling,
    getExecutionMetrics,
    setFlowName,
} from './flow-control';
import { syncSleep, asyncSleep } from '../timing';

const TOLERANCE = 5;

describe('getExecutionMetrics', () => {
    describe('Profiling disabled', () => {
        beforeEach(() => {
            disableProfiling();
        });

        it('should return correct value with sync functions', async () => {
            const { resultPromise } = await getExecutionMetrics(() => 42);

            expect(await resultPromise).toBe(42);
        });

        it('should return correct value with async functions', async () => {
            const { resultPromise } = await getExecutionMetrics(async () => 42);

            expect(await resultPromise).toBe(42);
        });

        it('should reject with sync throwing', async () => {
            const { resultPromise } = await getExecutionMetrics(() => {
                throw new Error('error');
            });

            await expect(resultPromise).rejects.toThrow('error');
        });

        it('should reject with async rejections', async () => {
            const { resultPromise } = await getExecutionMetrics(async () => {
                throw new Error('error');
            });

            await expect(resultPromise).rejects.toThrow('error');
        });

        it('should not measure metrics with disabled profiling', async () => {
            const metrics = await getExecutionMetrics(() => {
                syncSleep(20);
                return 42;
            });

            expect(metrics.totalExecutionTime).toBe(0);
            expect(metrics.totalEventLoopTime).toBe(0);
            expect(await metrics.resultPromise).toBe(42);
        });

        it('should not return name with disabled profiling', async () => {
            const metrics = await getExecutionMetrics(() => 42, {
                flowName: 'test',
            });

            expect(metrics.flowName).toBe('<profiling is disabled>');
        });
    });

    describe('Profiling enabled', () => {
        beforeEach(() => {
            enableProfiling();
        });

        it('should return correct value with sync functions', async () => {
            const { resultPromise } = await getExecutionMetrics(() => 42);

            expect(await resultPromise).toBe(42);
        });

        it('should return correct value with async functions', async () => {
            const { resultPromise } = await getExecutionMetrics(async () => 42);

            expect(await resultPromise).toBe(42);
        });

        it('should return correct event loop time with async functions', async () => {
            const metrics = await getExecutionMetrics(async () => {
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
            const metrics = await getExecutionMetrics(() => {
                syncSleep(20);
                return 42;
            });

            expect(metrics.totalExecutionTime).toBeGreaterThan(20 - TOLERANCE);
            expect(metrics.totalExecutionTime).toBeLessThan(20 + TOLERANCE);
            expect(metrics.totalEventLoopTime).toBeGreaterThan(20 - TOLERANCE);
            expect(metrics.totalEventLoopTime).toBeLessThan(20 + TOLERANCE);
            expect(await metrics.resultPromise).toBe(42);
        });

        it('should support macrotasks', async () => {
            const metrics = await getExecutionMetrics(
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
            const metrics = await getExecutionMetrics(
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
            const metrics = await getExecutionMetrics(() => {
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
            const metrics = await getExecutionMetrics(async () => {
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
            const metrics1Promise = getExecutionMetrics(
                async () => {
                    await asyncSleep(10);
                    syncSleep(20);
                    await asyncSleep(50);
                    syncSleep(30);
                    return 41;
                },
                { flowName: 'metrics1' },
            );

            const metrics2Promise = getExecutionMetrics(
                async () => {
                    await asyncSleep(10);
                    syncSleep(20); // This will be queued and shouldn't affect the event loop time
                    await asyncSleep(100);
                    syncSleep(60);
                    return 42;
                },
                { flowName: 'metrics2' },
            );

            const [metrics1, metrics2] = await Promise.all([
                metrics1Promise,
                metrics2Promise,
            ]);

            expect(metrics1.totalEventLoopTime).toBeGreaterThan(50 - TOLERANCE);
            expect(metrics1.totalEventLoopTime).toBeLessThan(50 + TOLERANCE);
            expect(metrics1.flowName).toBe('metrics1');
            expect(await metrics1.resultPromise).toBe(41);

            expect(metrics2.totalEventLoopTime).toBeGreaterThan(80 - TOLERANCE);
            expect(metrics2.totalEventLoopTime).toBeLessThan(80 + TOLERANCE);
            expect(metrics2.flowName).toBe('metrics2');
            expect(await metrics2.resultPromise).toBe(42);
        });

        it('should return <unnamed flow> when name not provided', async () => {
            const metrics = await getExecutionMetrics(() => 42);

            expect(metrics.flowName).toBe('<unnamed flow>');
        });

        it('should return correct name when provided', async () => {
            const metrics = await getExecutionMetrics(() => 42, {
                flowName: 'test',
            });

            expect(metrics.flowName).toBe('test');
        });

        it('should return correct name when set later', async () => {
            const metrics = await getExecutionMetrics(async () => {
                await asyncSleep(10);
                setFlowName('test');
                await asyncSleep(10);
            });

            expect(metrics.flowName).toBe('test');
        });

        it('setFlowName should return false when not in a profiled flow', () => {
            expect(setFlowName('test')).toBe(false);
        });

        it('setFlowName should return true when in a profiled flow', async () => {
            const metrics = await getExecutionMetrics(async () => {
                return setFlowName('test');
            });

            expect(metrics.flowName).toBe('test');
            expect(await metrics.resultPromise).toBe(true);
        });
    });
});
