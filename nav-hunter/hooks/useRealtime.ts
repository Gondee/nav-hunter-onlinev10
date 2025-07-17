import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeClient } from '@/lib/realtime/client';
import type {
  RealtimeEventType,
  RealtimeConnectionState,
  RealtimeClientConfig,
} from '@/types/realtime';

interface UseRealtimeOptions extends RealtimeClientConfig {
  autoConnect?: boolean;
  onConnectionChange?: (state: RealtimeConnectionState) => void;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { autoConnect = true, onConnectionChange, ...clientConfig } = options;
  const clientRef = useRef<RealtimeClient | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>({
    status: 'disconnected',
    retryCount: 0,
  });
  const [isConnected, setIsConnected] = useState(false);

  // Initialize client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new RealtimeClient(clientConfig);
      
      // Set up connection state handler
      clientRef.current.setConnectionStateChangeHandler((state) => {
        setConnectionState(state);
        setIsConnected(state.status === 'connected');
        
        if (onConnectionChange) {
          onConnectionChange(state);
        }
      });

      // Auto-connect if enabled
      if (autoConnect) {
        clientRef.current.connect();
      }
    }

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Subscribe to events
  const subscribe = useCallback(
    (eventType: RealtimeEventType, handler: (data: any) => void) => {
      if (!clientRef.current) {
        console.warn('Realtime client not initialized');
        return () => {};
      }

      return clientRef.current.subscribe(eventType, handler);
    },
    []
  );

  // Unsubscribe from events
  const unsubscribe = useCallback(
    (eventType: RealtimeEventType, handler: (data: any) => void) => {
      if (!clientRef.current) {
        console.warn('Realtime client not initialized');
        return;
      }

      clientRef.current.unsubscribe(eventType, handler);
    },
    []
  );

  // Manual connect
  const connect = useCallback(() => {
    if (!clientRef.current) {
      console.warn('Realtime client not initialized');
      return;
    }

    clientRef.current.connect();
  }, []);

  // Manual disconnect
  const disconnect = useCallback(() => {
    if (!clientRef.current) {
      console.warn('Realtime client not initialized');
      return;
    }

    clientRef.current.disconnect();
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    if (!clientRef.current) {
      console.warn('Realtime client not initialized');
      return;
    }

    clientRef.current.reconnect();
  }, []);

  return {
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    reconnect,
    connectionState,
    isConnected,
  };
}

// Hook for subscribing to specific event types
export function useRealtimeEvent<T = any>(
  eventType: RealtimeEventType,
  handler: (data: T) => void,
  options?: UseRealtimeOptions
) {
  const { subscribe, unsubscribe, ...realtimeState } = useRealtime(options);
  const handlerRef = useRef(handler);

  // Update handler ref to avoid stale closures
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    // Create a stable handler that uses the ref
    const stableHandler = (data: T) => {
      handlerRef.current(data);
    };

    const unsubscribeFn = subscribe(eventType, stableHandler);

    return () => {
      unsubscribeFn();
    };
  }, [eventType, subscribe]);

  return realtimeState;
}

// Hook for multiple event subscriptions
export function useRealtimeEvents(
  subscriptions: Array<{
    eventType: RealtimeEventType;
    handler: (data: any) => void;
  }>,
  options?: UseRealtimeOptions
) {
  const { subscribe, ...realtimeState } = useRealtime(options);

  useEffect(() => {
    const unsubscribeFns = subscriptions.map(({ eventType, handler }) =>
      subscribe(eventType, handler)
    );

    return () => {
      unsubscribeFns.forEach((fn) => fn());
    };
  }, [subscriptions, subscribe]);

  return realtimeState;
}