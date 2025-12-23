/**
 * Custom React hooks for querying data with loading/error states
 * 
 * These hooks integrate with the centralized queries.ts system
 * and provide consistent loading/error handling across the app.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Generic hook for executing queries with loading/error states
 * 
 * IMPORTANT: Does NOT auto-retry on error to prevent infinite loops
 * when configuration or environment is unavailable.
 */
export function useQuery<T>(
  queryFn: (options?: any) => Promise<T>,
  params?: any,
  options?: {
    skip?: boolean; // Skip query execution
    refetchInterval?: number; // Auto-refetch interval in ms
  }
): UseQueryResult<T> {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  
  // Use ref to avoid including getAccessToken in dependencies
  const getAccessTokenRef = useRef(getAccessToken);
  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);
  
  // Store queryFn in ref to avoid triggering re-fetches when function reference changes
  const queryFnRef = useRef(queryFn);
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  // Store params in ref to avoid re-renders, but serialize for comparison
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);
  
  // Serialize params once per render for stable comparison
  const paramsStr = useMemo(() => {
    return params ? JSON.stringify(params) : '';
  }, [JSON.stringify(params)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (options?.skip) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Get auth token
        const token = await getAccessTokenRef.current();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Execute query using current refs
        const result = await queryFnRef.current({ ...paramsRef.current, headers });
        
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          setError(error);
          console.error('Query failed:', error);
          
          // CRITICAL: Don't retry automatically on error
          // This prevents infinite loops when config is missing or API is down
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [paramsStr, options?.skip, refetchTrigger]);

  // Auto-refetch interval
  useEffect(() => {
    if (options?.refetchInterval && !options?.skip && !error) {
      const interval = setInterval(() => {
        setRefetchTrigger(prev => prev + 1);
      }, options.refetchInterval);

      return () => clearInterval(interval);
    }
  }, [options?.refetchInterval, options?.skip, error]);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  return { data, loading, error, refetch };
}

/**
 * Hook for queries that depend on multiple parameters changing
 */
export function useQueryWithDeps<T>(
  queryFn: (params: any, options?: any) => Promise<T>,
  params: any,
  deps: React.DependencyList
): UseQueryResult<T> {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to avoid including getAccessToken in dependencies
  const getAccessTokenRef = useRef(getAccessToken);
  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const token = await getAccessTokenRef.current();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const result = await queryFn(params, { headers });
        
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          setError(error);
          console.error('Query failed:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => {
    setLoading(true);
    // Trigger will happen via deps change
  }, []);

  return { data, loading, error, refetch };
}

/**
 * Hook for paginated queries
 */
export function usePaginatedQuery<T>(
  queryFn: (params: any, options?: any) => Promise<T[]>,
  params: {
    page: number;
    limit: number;
    [key: string]: any;
  }
): UseQueryResult<T[]> & {
  page: number;
  setPage: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} {
  const [page, setPage] = useState(params.page);
  const queryParams = useMemo(
    () => ({ ...params, page, offset: (page - 1) * params.limit }),
    [page, params.limit]
  );
  
  const result = useQuery(() => queryFn(queryParams), queryParams);

  const hasNextPage = (result.data?.length || 0) === params.limit;
  const hasPrevPage = page > 1;

  return {
    ...result,
    page,
    setPage,
    hasNextPage,
    hasPrevPage,
  };
}

/**
 * Hook for executing mutations (write operations)
 */
export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables, options?: any) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  }
) {
  const { getAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | null>(null);
  
  const getAccessTokenRef = useRef(getAccessToken);
  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getAccessTokenRef.current();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const result = await mutationFn(variables, { headers });
        setData(result);
        options?.onSuccess?.(result, variables);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options?.onError?.(error, variables);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, options]
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      mutateAsync(variables).catch(() => {});
    },
    [mutateAsync]
  );

  return {
    mutate,
    mutateAsync,
    isLoading,
    error,
    data,
  };
}