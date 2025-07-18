'use client';

import { useEffect, useState } from 'react';

interface StatusPanelProps {
  // Support both prop formats for compatibility
  isConnected?: boolean;
  connectionStatus?: string;
  processedCount?: number;
  alertCount?: number;
  isMonitoring?: boolean;
  // Alternative prop names from DashboardContent
  processed?: number;
  alerts?: number;
  uptime?: string;
  wsStatus?: string;
  wsStatusColor?: string;
}

export function StatusPanel(props: StatusPanelProps) {
  // Use either set of props
  const isConnected = props.isConnected ?? (props.wsStatus === 'Connected');
  const connectionStatus = props.connectionStatus ?? props.wsStatus ?? 'Disconnected';
  const processedCount = props.processedCount ?? props.processed ?? 0;
  const alertCount = props.alertCount ?? props.alerts ?? 0;
  const isMonitoring = props.isMonitoring ?? false;
  const [uptime, setUptime] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Only run timer if uptime isn't provided as prop
    if (!props.uptime) {
      const interval = setInterval(() => {
        setUptime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startTime, props.uptime]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Use provided uptime or calculated one
  const displayUptime = props.uptime || formatUptime(uptime);

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold mb-4">System Status</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400 text-sm">Connection</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            } ${isConnected ? 'animate-pulse' : ''}`} />
            <span className={`font-medium ${
              isConnected ? 'text-green-400' : 'text-red-400'
            }`}>
              {connectionStatus}
            </span>
          </div>
        </div>

        <div>
          <p className="text-gray-400 text-sm">Monitoring</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-3 h-3 rounded-full ${
              isMonitoring ? 'bg-amber-500 animate-pulse' : 'bg-gray-500'
            }`} />
            <span className={`font-medium ${
              isMonitoring ? 'text-amber-400' : 'text-gray-400'
            }`}>
              {isMonitoring ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div>
          <p className="text-gray-400 text-sm">Processed</p>
          <p className="text-2xl font-bold text-white">{processedCount.toLocaleString()}</p>
        </div>

        <div>
          <p className="text-gray-400 text-sm">Alerts</p>
          <p className="text-2xl font-bold text-amber-400">{alertCount.toLocaleString()}</p>
        </div>

        <div className="col-span-2">
          <p className="text-gray-400 text-sm">Uptime</p>
          <p className="text-xl font-mono text-blue-400">{displayUptime}</p>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">SEC WebSocket</span>
          <span className={`${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs mt-2">
          <span className="text-gray-500">AI Analysis</span>
          <span className="text-green-400">Ready</span>
        </div>
      </div>
    </div>
  );
}