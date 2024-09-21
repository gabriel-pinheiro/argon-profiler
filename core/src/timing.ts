export async function releaseEventLoop(): Promise<void> {
    return new Promise((r) => setImmediate(r));
}

export const asyncSleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function syncSleep(ms: number) {
    const start = Date.now();
    while (Date.now() - start < ms) {
        // Use event loop time
    }
}
