"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoryCache = createMemoryCache;
function createMemoryCache({ ttlMs, maxEntries = 500 }) {
    const entries = new Map();
    const inFlight = new Map();
    function evictExpired(now) {
        for (const [key, entry] of entries) {
            if (entry.expiresAt <= now) {
                entries.delete(key);
            }
        }
    }
    function store(key, value) {
        const now = Date.now();
        if (entries.size >= maxEntries) {
            evictExpired(now);
        }
        if (entries.size >= maxEntries) {
            const oldestKey = entries.keys().next().value;
            if (oldestKey !== undefined) {
                entries.delete(oldestKey);
            }
        }
        entries.set(key, { value, expiresAt: now + ttlMs });
    }
    async function getOrLoad(key, loader) {
        if (ttlMs <= 0) {
            return loader();
        }
        const cached = entries.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }
        const pending = inFlight.get(key);
        if (pending) {
            return pending;
        }
        const request = loader()
            .then((value) => {
            store(key, value);
            return value;
        })
            .finally(() => {
            inFlight.delete(key);
        });
        inFlight.set(key, request);
        return request;
    }
    return { getOrLoad };
}
