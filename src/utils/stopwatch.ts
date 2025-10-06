export function fromBullTimestamp(enqueuedMs: number) {
    const start = enqueuedMs ?? Date.now();
    return {
        start,
        endNow() { return { finished: Date.now(), totalMs: Math.max(0, Date.now() - start) }; }
    };
}
