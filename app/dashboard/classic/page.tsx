'use client';

import { useEffect, useState, useCallback } from 'react';

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
  };
}

export default function ClassicDashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [processedCount, setProcessedCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const connectToSSE = useCallback(() => {
    setConnectionStatus('Connecting...');
    
    const eventSource = new EventSource('/api/alerts/stream');
    
    eventSource.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('Connected');
      console.log('SSE connection opened');
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
            analysis: data.analysis
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

        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
          
          {alerts.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              <p>No alerts yet. Monitoring SEC filings...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-gray-800 rounded-lg p-4 border-l-4 ${
                    alert.isGoldAlert 
                      ? 'border-amber-500 shadow-amber-500/20 shadow-lg' 
                      : 'border-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {alert.company} ({alert.ticker})
                      </h3>
                      <p className="text-sm text-gray-400">
                        {alert.formType} • {new Date(alert.filedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className={`text-sm font-medium ${
                      alert.confidenceScore >= 80 ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {alert.confidenceScore}% confidence
                    </div>
                  </div>
                  
                  {alert.analysis?.summary && (
                    <p className="text-gray-300 text-sm">{alert.analysis.summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
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