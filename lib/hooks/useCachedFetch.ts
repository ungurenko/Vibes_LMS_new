import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuthGet } from '../fetchWithAuth';
import { getCached, setCache } from '../cache';

interface UseCachedFetchOptions {
  cacheKey: string;
  cacheTTL: number;
  /** If true, shows cached data immediately and refetches in background */
  staleWhileRevalidate?: boolean;
}

interface UseCachedFetchResult<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCachedFetch<T>(
  url: string,
  initialData: T,
  options: UseCachedFetchOptions
): UseCachedFetchResult<T> {
  const { cacheKey, cacheTTL, staleWhileRevalidate = false } = options;
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const cached = getCached<T>(cacheKey, cacheTTL);
      if (cached) {
        setData(cached);
        setIsLoading(false);
        if (!staleWhileRevalidate) return;
      }

      if (!cached) setIsLoading(true);

      const freshData = await fetchWithAuthGet<T>(url);
      if (!mountedRef.current) return;

      setData(freshData);
      setCache(cacheKey, freshData);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error(`Error fetching ${url}:`, err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [url, cacheKey, cacheTTL, staleWhileRevalidate]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
