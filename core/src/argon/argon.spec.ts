import {
    beginProfiling,
    endProfiling,
    getStatistics,
    runWithProfiling,
} from './argon-profiler';
import { asyncSleep, syncSleep } from '../timing';

const TOLERANCE = 10;

function profiledFlow(name: string) {
    return runWithProfiling(name, async () => {
        syncSleep(10);
        await asyncSleep(20);
        syncSleep(40);
        await asyncSleep(80);
        syncSleep(160);
        return 42;
    });
}

describe('Argon Profiler', () => {
    describe('Profiling disabled', () => {
        beforeEach(() => {
            endProfiling();
        });

        it('should keep original sync function return', async () => {
            const result = await runWithProfiling('', () => 42);
            expect(result).toBe(42);
        });

        it('should keep original async function return', async () => {
            const result = await runWithProfiling('', async () => 42);
            expect(result).toBe(42);
        });
    });

    describe('Profiling enabled', () => {
        beforeEach(() => {
            beginProfiling();
        });

        it('should keep original sync function return', async () => {
            const result = await runWithProfiling('', () => 42);
            expect(result).toBe(42);
        });

        it('should keep original async function return', async () => {
            const result = await runWithProfiling('', async () => 42);
            expect(result).toBe(42);
        });

        it('should track flow name', async () => {
            await profiledFlow('flow-name');
            endProfiling();
            const stats = getStatistics();
            const flow = stats.flowStats.find((f) => f.name === 'flow-name');
            expect(flow).toBeDefined();
        });

        it('should track flow time statistics', async () => {
            await profiledFlow('test');
            endProfiling();
            const stats = getStatistics();
            const flow = stats.flowStats.find((f) => f.name === 'test');
            expect(flow).toBeDefined();
            expect(flow!.totalExecutionTime).toBeGreaterThan(310 - TOLERANCE);
            expect(flow!.totalExecutionTime).toBeLessThan(310 + TOLERANCE);
            expect(flow!.totalEventLoopTime).toBeGreaterThan(210 - TOLERANCE);
            expect(flow!.totalEventLoopTime).toBeLessThan(210 + TOLERANCE);
            expect(flow!.executions).toBe(1);
        });

        it('should track executions', async () => {
            await runWithProfiling('test', () => 42);
            await runWithProfiling('test', () => 42);
            endProfiling();
            const stats = getStatistics();
            const flow = stats.flowStats.find((f) => f.name === 'test');
            expect(flow).toBeDefined();
            expect(flow!.executions).toBe(2);
        });

        it('should track parallell flows', async () => {
            const flows = [
                profiledFlow('test1'),
                profiledFlow('test1'),
                profiledFlow('test1'),
                profiledFlow('test2'),
                profiledFlow('test2'),
            ];

            await Promise.all(flows);

            endProfiling();
            const stats = getStatistics();
            const f1 = stats.flowStats.find((f) => f.name === 'test1');
            const f2 = stats.flowStats.find((f) => f.name === 'test2');

            expect(f1).toBeDefined();
            expect(f1!.executions).toBe(3);
            expect(f1!.averageEventLoopTime).toBeGreaterThan(210 - TOLERANCE);
            expect(f1!.averageEventLoopTime).toBeLessThan(210 + TOLERANCE);
            expect(f1!.totalEventLoopTime).toBeGreaterThan(3 * 210 - TOLERANCE);
            expect(f1!.totalEventLoopTime).toBeLessThan(3 * 210 + TOLERANCE);
            expect(f2).toBeDefined();
            expect(f2!.executions).toBe(2);
            expect(f2!.averageEventLoopTime).toBeGreaterThan(210 - TOLERANCE);
            expect(f2!.averageEventLoopTime).toBeLessThan(210 + TOLERANCE);
            expect(f2!.totalEventLoopTime).toBeGreaterThan(2 * 210 - TOLERANCE);
            expect(f2!.totalEventLoopTime).toBeLessThan(2 * 210 + TOLERANCE);
        });

        it('should track global stats', async () => {
            const flows = [
                profiledFlow('test1'), // + 210
                profiledFlow('test1'), // + 210
                profiledFlow('test2'), // + 210
            ];
            await Promise.all(flows);
            syncSleep(100); // +100. total = 730
            endProfiling();
            const stats = getStatistics();

            expect(stats.globalEventLoopTime).toBeGreaterThan(730 - TOLERANCE);
            expect(stats.globalEventLoopTime).toBeLessThan(730 + TOLERANCE);
            expect(stats.untrackedEventLoopTime).toBeGreaterThan(
                100 - TOLERANCE,
            );
            expect(stats.untrackedEventLoopTime).toBeLessThan(100 + TOLERANCE);
            expect(stats.untrackedEventLoopUsage).toBeGreaterThan(
                100 / 730 - TOLERANCE,
            );
            expect(stats.untrackedEventLoopUsage).toBeLessThan(
                100 / 730 + TOLERANCE,
            );
        });

        it('should track derived flow stats', async () => {
            await profiledFlow('test');
            await profiledFlow('test');
            await profiledFlow('test');
            syncSleep(100);
            endProfiling();
            const stats = getStatistics();
            const flow = stats.flowStats.find((f) => f.name === 'test');

            expect(flow).toBeDefined();
            expect(flow!.averageExecutionTime).toBeGreaterThan(310 - TOLERANCE);
            expect(flow!.averageExecutionTime).toBeLessThan(310 + TOLERANCE);
            expect(flow!.averageEventLoopTime).toBeGreaterThan(210 - TOLERANCE);
            expect(flow!.averageEventLoopTime).toBeLessThan(210 + TOLERANCE);
            expect(flow!.eventLoopUsage).toBeGreaterThan(630 / 730 - TOLERANCE);
            expect(flow!.eventLoopUsage).toBeLessThan(630 / 730 + TOLERANCE);
        });
    });
});
