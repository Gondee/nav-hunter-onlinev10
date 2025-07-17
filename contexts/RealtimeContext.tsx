'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeClient } from '@/lib/realtime/client';
import type {
  RealtimeEvent,
  RealtimeEventType,
  RealtimeConnectionState,
  RealtimeContextValue,
  RealtimeClientConfig,
} from '@/types/realtime';

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  children: React.ReactNode;
  config?: RealtimeClientConfig;
  maxEventHistory?: number;
}

export function RealtimeProvider({
  children,
  config,
  maxEventHistory = 100,
}: RealtimeProviderProps) {
  const clientRef = useRef<RealtimeClient | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>({
    status: 'disconnected',
    retryCount: 0,
  });
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const eventListenersRef = useRef<Map<RealtimeEventType, Set<(data: any) => void>>>(new Map());

  // Initialize client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new RealtimeClient(config);
      
      // Set up connection state handler
      clientRef.current.setConnectionStateChangeHandler((state) => {
        setConnectionState(state);
      });

      // Connect automatically
      clientRef.current.connect();

      // Subscribe to all events for history
      const eventTypes: RealtimeEventType[] = [
        'log_message',
        'ai_log_message',
        'new_alert',
        'play_tts_audio',
        'update_stats',
        'monitoring_status',
        'ws_status',
        'ws_status_flash',
        'test_ticker_finished',
        'replay_finished',
        'server_shutting_down',
      ];

      eventTypes.forEach((eventType) => {
        clientRef.current!.subscribe(eventType, (data) => {
          const event: RealtimeEvent = {
            type: eventType,
            data,
            timestamp: Date.now(),
          };

          // Add to event history
          setEvents((prev) => {
            const newEvents = [...prev, event];
            // Limit history size
            if (newEvents.length > maxEventHistory) {
              return newEvents.slice(-maxEventHistory);
            }
            return newEvents;
          });

          // Notify listeners
          const listeners = eventListenersRef.current.get(eventType);
          if (listeners) {
            listeners.forEach((listener) => {
              try {
                listener(data);
              } catch (error) {
                console.error(`Error in event listener for ${eventType}:`, error);
              }
            });
          }
        });
      });
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
    (eventType: RealtimeEventType, handler: (data: any) => void): (() => void) => {
      if (!eventListenersRef.current.has(eventType)) {
        eventListenersRef.current.set(eventType, new Set());
      }
      
      eventListenersRef.current.get(eventType)!.add(handler);

      // Return unsubscribe function
      return () => {
        unsubscribe(eventType, handler);
      };
    },
    []
  );

  // Unsubscribe from events
  const unsubscribe = useCallback(
    (eventType: RealtimeEventType, handler: (data: any) => void) => {
      const listeners = eventListenersRef.current.get(eventType);
      if (listeners) {
        listeners.delete(handler);
        if (listeners.size === 0) {
          eventListenersRef.current.delete(eventType);
        }
      }
    },
    []
  );

  // Clear event history
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.reconnect();
    }
  }, []);

  const value: RealtimeContextValue = {
    connectionState,
    events,
    subscribe,
    unsubscribe,
    clearEvents,
    reconnect,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

// Hook to use realtime context
export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  
  if (!context) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  
  return context;
}

// Hook to subscribe to specific events via context
export function useRealtimeEventContext<T = any>(
  eventType: RealtimeEventType,
  handler: (data: T) => void
) {
  const { subscribe, connectionState } = useRealtimeContext();
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

    const unsubscribe = subscribe(eventType, stableHandler);

    return unsubscribe;
  }, [eventType, subscribe]);

  return { connectionState };
}

// Hook to get event history
export function useRealtimeEventHistory(
  eventType?: RealtimeEventType,
  limit?: number
) {
  const { events } = useRealtimeContext();

  return events
    .filter((event) => !eventType || event.type === eventType)
    .slice(limit ? -limit : undefined);
}