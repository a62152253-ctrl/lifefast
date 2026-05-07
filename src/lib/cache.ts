import { useState, useEffect, useCallback } from 'react';

// Simple in-memory cache with TTL support
class Cache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const cache = new Cache();

// React hook for caching
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Check cache first
      const cached = cache.get(key);
      if (cached) {
        setData(cached);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();
        cache.set(key, result, ttl);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key, fetcher, ttl]);

  const invalidate = useCallback(() => {
    cache.delete(key);
  }, [key]);

  return { data, loading, error, invalidate };
}
