'use client';

import { useEffect, useState, useCallback } from 'react';
import { StatusPanel } from '@/components/status/StatusPanel';
import { SimpleAlertCard } from '@/components/alerts/SimpleAlertCard';

interface Alert {
  id: string;
  ticker: string;
  company: string;
  formType: string;
  filedAt: string;
  confidenceScore: number;
  isGoldAlert: boolean;
  analysis?: {
    summary?: string;
    keyPoints?: string[];
    recommendation?: string;
  };
  linkToFiling?: string;
  processingDelay?: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export default function ClassicDashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [processedCount, setProcessedCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(true);

  const connectToSSE = useCallback(() => {
    setConnectionStatus('Connecting...');
    
    const eventSource = new EventSource('/api/alerts/stream');
    
    eventSource.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('Connected');
      console.log('SSE connection opened');
      
      const logEntry: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        message: 'Connected to SEC monitoring stream',
        type: 'success'
      };
      setLogs(prev => [logEntry, ...prev].slice(0, 100));
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_alert') {
          const newAlert: Alert = {
            id: data.id || Date.now().toString(),
            ticker: data.ticker,
            company: data.company,
            formType: data.formType,
            filedAt: data.filedAt,
            confidenceScore: data.confidenceScore,
            isGoldAlert: data.isGoldAlert || false,
            analysis: data.analysis,
            linkToFiling: data.linkToFiling,
            processingDelay: data.processingDelay
          };
          
          setAlerts(prev => [newAlert, ...prev].slice(0, 50));
          setAlertCount(prev => prev + 1);
        } else if (data.type === 'update_stats') {
          if (data.processedCount !== undefined) {
            setProcessedCount(data.processedCount);
          }
          if (data.alertCount !== undefined) {
            setAlertCount(data.alertCount);
          }
        } else if (data.type === 'ws_status') {
          setConnectionStatus(data.status);
        } else if (data.type === 'monitoring_status') {
          setIsMonitoring(data.isMonitoring);
        } else if (data.type === 'log_message') {
          const logEntry: LogEntry = {
            id: Date.now().toString() + Math.random(),
            timestamp: data.timestamp || new Date().toISOString(),
            message: data.message,
            type: data.level === 'error' ? 'error' : data.level === 'warning' ? 'warning' : 'info'
          };
          setLogs(prev => [logEntry, ...prev].slice(0, 100));
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      console.error('SSE connection error');
      eventSource.close();
      
      // Reconnect after 5 seconds
      setTimeout(connectToSSE, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    const cleanup = connectToSSE();
    return cleanup;
  }, [connectToSSE]);

  const startMonitoring = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sec/start', { method: 'POST' });
      if (response.ok) {
        setIsMonitoring(true);
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
    setIsLoading(false);
  };

  const stopMonitoring = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sec/stop', { method: 'POST' });
      if (response.ok) {
        setIsMonitoring(false);
      }
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">NAV Hunter Dashboard</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded text-sm ${
                isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {connectionStatus}
              </span>
              <span className="text-gray-400">
                Processed: {processedCount} | Alerts: {alertCount}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {!isMonitoring ? (
                <button
                  onClick={startMonitoring}
                  disabled={isLoading || !isConnected}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Starting...' : 'Start Monitoring'}
                </button>
              ) : (
                <button
                  onClick={stopMonitoring}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Stopping...' : 'Stop Monitoring'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
            
            {alerts.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                <p>No alerts yet. Monitoring SEC filings...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <SimpleAlertCard
                    key={alert.id}
                    {...alert}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div>
            <StatusPanel
              isConnected={isConnected}
              connectionStatus={connectionStatus}
              processedCount={processedCount}
              alertCount={alertCount}
              isMonitoring={isMonitoring}
            />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">System Logs</h2>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-sm text-gray-400 hover:text-white"
            >
              {showLogs ? 'Hide' : 'Show'} Logs
            </button>
          </div>
          
          {showLogs && (
            <div className="bg-gray-800 rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet...</p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex gap-2 ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        log.type === 'success' ? 'text-green-400' :
                        'text-gray-300'
                      }`}
                    >
                      <span className="text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <a 
            href="/"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}