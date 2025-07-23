import { useState, useEffect } from 'react';
import { tinybirdService } from '@/lib/tinybird';

export function useTinybirdConnection() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we have any user configuration
      const savedConfig = localStorage.getItem('brandbuddy_connections');
      let hasUserConfig = false;

      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          hasUserConfig = !!(config.tinybird?.token && config.tinybird.token.trim());
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Only test connection if we have user config, otherwise assume disconnected
      if (hasUserConfig) {
        const result = await tinybirdService.testConnection();
        setIsConnected(result.success);
        if (!result.success) {
          setError(result.message || 'Connection failed');
        }
      } else {
        // No user config, mark as disconnected but don't show as error
        setIsConnected(false);
        setError(null);
      }
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.warn('Connection check failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return {
    isConnected: isConnected === true, // Ensure boolean
    isLoading,
    error,
    retry: checkConnection
  };
}
