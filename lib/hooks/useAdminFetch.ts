import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuthGet } from '../fetchWithAuth';

interface UseAdminFetchResult<T> {
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  isLoading: boolean;
  reload: () => Promise<void>;
}

/**
 * Hook for fetching admin data from API.
 * Replaces repetitive loadX() functions in AdminContent.
 *
 * @param url - API endpoint URL
 * @param initialData - Initial data before fetch completes
 * @returns { data, setData, isLoading, reload }
 */
export function useAdminFetch<T>(url: string, initialData: T): UseAdminFetchResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      const freshData = await fetchWithAuthGet<T>(url);
      if (mountedRef.current) {
        setData(freshData);
      }
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      // Keep previous data on error
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    reload();
    return () => { mountedRef.current = false; };
  }, [reload]);

  return { data, setData, isLoading, reload };
}
