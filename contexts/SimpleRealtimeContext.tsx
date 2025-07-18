'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SSEClient } from '@/lib/realtime/sse-client';

interface RealtimeContextValue {
  events: any[];
  isConnected: boolean;
  stats: {
    totalAlerts: number;
    totalFilings: number;
  };
}

const RealtimeContext = createContext<RealtimeContextValue>({
  events: [],
  isConnected: false,
  stats: {
    totalAlerts: 0,
    totalFilings: 0,
  },
});

export function SimpleRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({ totalAlerts: 0, totalFilings: 0 });
  const clientRef = useRef<SSEClient | null>(null);

  useEffect(() => {
    const client = new SSEClient();
    clientRef.current = client;

    // Connect to SSE endpoint
    client.connect('/api/alerts/stream');
    setIsConnected(true);

    // Listen for events
    client.on('alert', (data) => {
      setEvents(prev => [...prev, data].slice(-100)); // Keep last 100 events
      setStats(prev => ({ ...prev, totalAlerts: prev.totalAlerts + 1 }));
    });

    client.on('filing', (data) => {
      setEvents(prev => [...prev, data].slice(-100));
      setStats(prev => ({ ...prev, totalFilings: prev.totalFilings + 1 }));
    });

    client.on('status', (data) => {
      console.log('Status update:', data);
    });

    return () => {
      client.disconnect();
      setIsConnected(false);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ events, isConnected, stats }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within SimpleRealtimeProvider');
  }
  return context;
};