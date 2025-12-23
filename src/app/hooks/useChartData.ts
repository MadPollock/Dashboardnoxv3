import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isMockQueriesEnabled, getApiBaseUrl } from '../config/runtime';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export type QueryId = 'revenue-monthly' | 'user-activity-daily' | 'transactions-24h';

interface QueryDefinition {
  id: QueryId;
  name: string;
  description: string;
  endpoint: string;
  defaultParams?: Record<string, string | number>;
}

const queryRegistry: Record<QueryId, QueryDefinition> = {
  'revenue-monthly': {
    id: 'revenue-monthly',
    name: 'Revenue Monthly',
    description: 'Monthly revenue and expenses grouped by month',
    endpoint: 'revenue',
    defaultParams: { scope: 'monthly' },
  },
  'user-activity-daily': {
    id: 'user-activity-daily',
    name: 'User Activity Daily',
    description: 'Active and inactive users per day',
    endpoint: 'users',
    defaultParams: { granularity: 'daily' },
  },
  'transactions-24h': {
    id: 'transactions-24h',
    name: 'Transactions 24h',
    description: 'Hourly transaction volume for the last 24 hours',
    endpoint: 'transactions',
    defaultParams: { range: '24h' },
  },
};

function getQueryDefinition(queryId: QueryId): QueryDefinition {
  return queryRegistry[queryId];
}

interface UseChartDataOptions {
  dataSource?: 'api' | 'mock';
  refreshInterval?: number;
  queryParams?: Record<string, string | number>;
  endpoint?: string;
}

/**
 * Custom hook for fetching chart data following CQRS read pattern.
 * Separates data fetching logic from presentation components.
 * 
 * Note: This hook is deprecated. Use the new query system in /src/app/lib/queries.ts instead.
 * For analytics, use queryPaymentsOverview, queryVolumeOverview, etc.
 */
export function useChartData<T extends ChartDataPoint>(
  queryId: QueryId,
  options: UseChartDataOptions = {}
) {
  const { dataSource = 'mock', refreshInterval, queryParams, endpoint } = options;
  const { getAccessToken, user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isInitialLoad = useRef(true);

  // Stabilize user data using refs to avoid unnecessary refetches
  const userIdRef = useRef(user?.id);
  const userRoleRef = useRef(user?.role);
  const userMetadataRef = useRef(user?.metadata);
  
  // Update refs when user data changes
  if (user?.id !== userIdRef.current) {
    userIdRef.current = user?.id;
  }
  if (user?.role !== userRoleRef.current) {
    userRoleRef.current = user?.role;
  }
  if (user?.metadata !== userMetadataRef.current) {
    userMetadataRef.current = user?.metadata;
  }

  const fetchData = useCallback(async () => {
    // Only show loading skeleton on initial load, not on background refreshes
    if (isInitialLoad.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const definition = getQueryDefinition(queryId);
      
      // Check runtime config for mock mode
      const mockMode = isMockQueriesEnabled();
      const apiBaseUrl = getApiBaseUrl();
      
      const urlBase = endpoint || `${apiBaseUrl}/${definition.endpoint}`;

      // Prefer API reads when configured; fallback to mock data otherwise
      if (!mockMode && dataSource === 'api' && urlBase) {
        const url = new URL(urlBase);
        const paramsToSend = {
          ...definition.defaultParams,
          ...queryParams,
        };

        if (paramsToSend) {
          Object.entries(paramsToSend).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.set(key, String(value));
            }
          });
        }

        if (queryParams) {
          Object.entries(queryParams).forEach(([key, value]) => {
            url.searchParams.set(key, String(value));
          });
        }

        if (userIdRef.current) {
          url.searchParams.set('userId', userIdRef.current);
        }

        const token = await getAccessToken();
        if (!token) {
          throw new Error('Missing access token for read query');
        }

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-user-role': userRoleRef.current || '',
            'x-user-metadata': JSON.stringify(userMetadataRef.current ?? {}),
          },
        });

        if (!response.ok) {
          throw new Error(`Read query failed with status ${response.status}`);
        }

        const body = await response.json();
        setData((body?.data as T[]) ?? (body as T[]));
        return;
      }

      // Mock fallback
      if (mockMode || dataSource === 'mock' || !urlBase) {
        if (!mockMode && dataSource === 'api' && !urlBase) {
          console.warn('API URL not configured, serving mock data for', definition.id);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockData = generateMockData(queryId);
        setData(mockData as T[]);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
      isInitialLoad.current = false;
    }
  }, [dataSource, endpoint, getAccessToken, queryId, queryParams]);

  useEffect(() => {
    fetchData();

    if (refreshInterval) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return { data, isLoading, error, refetch: fetchData };
}

// Mock data generator - in production, this comes from your read model database
function generateMockData(queryId: QueryId): ChartDataPoint[] {
  switch (queryId) {
    case 'revenue-monthly':
      return [
        { name: 'Jan', value: 4000, revenue: 4000, expenses: 2400 },
        { name: 'Feb', value: 3000, revenue: 3000, expenses: 1398 },
        { name: 'Mar', value: 2000, revenue: 2000, expenses: 9800 },
        { name: 'Apr', value: 2780, revenue: 2780, expenses: 3908 },
        { name: 'May', value: 1890, revenue: 1890, expenses: 4800 },
        { name: 'Jun', value: 2390, revenue: 2390, expenses: 3800 },
        { name: 'Jul', value: 3490, revenue: 3490, expenses: 4300 },
      ];
    
    case 'user-activity-daily':
      return [
        { name: 'Mon', value: 120, active: 120, inactive: 40 },
        { name: 'Tue', value: 150, active: 150, inactive: 30 },
        { name: 'Wed', value: 180, active: 180, inactive: 25 },
        { name: 'Thu', value: 165, active: 165, inactive: 35 },
        { name: 'Fri', value: 190, active: 190, inactive: 20 },
        { name: 'Sat', value: 145, active: 145, inactive: 45 },
        { name: 'Sun', value: 135, active: 135, inactive: 50 },
      ];
    
    case 'transactions-24h':
      return [
        { name: '00:00', value: 45 },
        { name: '04:00', value: 23 },
        { name: '08:00', value: 78 },
        { name: '12:00', value: 120 },
        { name: '16:00', value: 95 },
        { name: '20:00', value: 67 },
      ];
    
    default:
      return [
        { name: 'A', value: 100 },
        { name: 'B', value: 200 },
        { name: 'C', value: 150 },
      ];
  }
}