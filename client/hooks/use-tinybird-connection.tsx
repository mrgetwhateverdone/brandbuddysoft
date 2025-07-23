import { useState, useEffect } from 'react';
import { tinybirdService } from '@/lib/tinybird';

export function useTinybirdConnection() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await tinybirdService.testConnection();
      setIsConnected(result.success);
      if (!result.success) {
        setError(result.error || 'Connection failed');
      }
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return {
    isConnected,
    isLoading,
    error,
    retry: checkConnection
  };
}
