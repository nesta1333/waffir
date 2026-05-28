import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

/**
 * Returns true if the device has an active internet connection.
 * Re-checks every 10 seconds.
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!cancelled) setIsOnline(state.isConnected ?? true);
      } catch {
        if (!cancelled) setIsOnline(true); // assume online on error
      }
    };

    check();
    const interval = setInterval(check, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
