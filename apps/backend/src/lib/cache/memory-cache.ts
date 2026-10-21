interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface MemoryCacheOptions {
  ttlMs: number;
  maxEntries?: number;
}

function createMemoryCache<T>({ ttlMs, maxEntries = 500 }: MemoryCacheOptions) {
  const entries = new Map<string, CacheEntry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  function evictExpired(now: number) {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) {
        entries.delete(key);
      }
    }
  }

  function store(key: string, value: T) {
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

  async function getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
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

export { createMemoryCache };
