'use client';

import { useState, useEffect } from 'react';
import { useRealtimeContext, useRealtimeEventContext } from '@/contexts/RealtimeContext';
import { AlertCard, type AlertData } from '@/components/alerts/AlertCard';
import { StatusPanel } from '@/components/status/StatusPanel';
import { ConfigPanel } from '@/components/config/ConfigPanel';
import { SecAPI } from '@/lib/services/sec-api';
import type { Alert, Stats } from '@/types/realtime';

export function DashboardContent() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [stats, setStats] = useState<Stats>({
    processed: 0,
    alerts: 0,
    uptime: '00:00',
    connectionStatus: 'Off',
    connectionColor: 'text-nav-text-muted'
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const { connectionState } = useRealtimeContext();
  
  // Listen for alerts
  useRealtimeEventContext('alert', (data: any) => {
    if (data.level === 'gold' || data.level === 'blue') {
      const newAlert: AlertData = {
        id: data.filing.id || Date.now().toString(),
        companyName: data.filing.companyName,
        ticker: data.filing.ticker,
        confidenceScore: data.level === 'gold' ? 95 : 85,
        alertHighlight: data.level === 'gold',
        formType: data.filing.formType,
        filedAt: data.filing.filedAt,
        delayString: 'Just now',
        tradingViewUrl: `https://www.tradingview.com/symbols/${data.filing.ticker}/`,
        secFilingUrl: data.filing.linkToFilingDetails,
        details: {
          value: data.filing.value,
          reportDate: data.filing.reportDate,
          ...data.filing.raw
        }
      };
      setAlerts((prev: AlertData[]) => [newAlert, ...prev]);
      setStats((prev: Stats) => ({ ...prev, alerts: prev.alerts + 1 }));
      
      // Play alert sound
      SecAPI.playAlertSound(`Alert on ticker ${data.filing.ticker}`);
    }
  });
  
  // Listen for filing updates
  useRealtimeEventContext('filing', (data: any) => {
    setStats((prev: Stats) => ({ ...prev, processed: prev.processed + 1 }));
  });
  
  // Listen for status updates
  useRealtimeEventContext('status', (data: any) => {
    if (data.status === 'connected') {
      setStats((prev: Stats) => ({
        ...prev,
        connectionStatus: 'Connected',
        connectionColor: 'text-nav-accent-green'
      }));
    } else if (data.status === 'disconnected') {
      setStats((prev: Stats) => ({
        ...prev,
        connectionStatus: 'Disconnected',
        connectionColor: 'text-nav-accent-red'
      }));
    }
  });
  
  // Update connection status based on realtime connection
  useEffect(() => {
    if (connectionState.status === 'connected') {
      setStats((prev: Stats) => ({
        ...prev,
        connectionStatus: 'Connected',
        connectionColor: 'text-nav-accent-green'
      }));
    } else if (connectionState.status === 'connecting') {
      setStats((prev: Stats) => ({
        ...prev,
        connectionStatus: 'Connecting',
        connectionColor: 'text-nav-accent-yellow'
      }));
    } else {
      setStats((prev: Stats) => ({
        ...prev,
        connectionStatus: 'Disconnected',
        connectionColor: 'text-nav-accent-red'
      }));
    }
  }, [connectionState.status]);
  
  const handleStartMonitoring = async () => {
    try {
      await SecAPI.startMonitoring();
      setIsMonitoring(true);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };
  
  const handleStopMonitoring = async () => {
    try {
      await SecAPI.stopMonitoring();
      setIsMonitoring(false);
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };
  
  return (
    <>
      {/* Alerts Section */}
      <div className="panel mb-6">
        <h3 className="text-xl font-semibold mb-4 text-nav-accent-blue">
          🔊 SEC Filing Alerts
        </h3>
        <div id="alertsContainer">
          {alerts.length === 0 ? (
            <p className="text-nav-text-muted">No alerts yet</p>
          ) : (
            alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          )}
        </div>
      </div>

      {/* Configuration Panel with monitoring controls */}
      <div className="panel mb-6">
        <h3 className="text-xl font-semibold mb-4">Configuration</h3>
        <div className="mt-4 flex gap-4">
          <button
            onClick={handleStartMonitoring}
            disabled={isMonitoring}
            className="bg-nav-accent-green hover:bg-green-600 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
          >
            Start Monitoring
          </button>
          <button
            onClick={handleStopMonitoring}
            disabled={!isMonitoring}
            className="bg-nav-accent-red hover:bg-red-600 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
          >
            Stop Monitoring
          </button>
        </div>
      </div>

      {/* Status Panel */}
      <StatusPanel
        processed={stats.processed}
        alerts={stats.alerts}
        uptime={stats.uptime}
        wsStatus={stats.connectionStatus}
        wsStatusColor={stats.connectionColor}
      />
    </>
  );
}