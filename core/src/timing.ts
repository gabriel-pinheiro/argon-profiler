export async function releaseEventLoop(): Promise<void> {
    return new Promise((r) => setImmediate(r));
}
