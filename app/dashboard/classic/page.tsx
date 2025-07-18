'use client';

import { SimpleRealtimeProvider, useRealtime } from '@/contexts/SimpleRealtimeContext';

function DashboardContent() {
  const { events, isConnected, stats } = useRealtime();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">NAV Hunter Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isConnected ? '● Connected' : '● Disconnected'}
            </span>
            <button 
              onClick={() => window.location.href = '/'}
              className="text-sm text-gray-400 hover:text-white"
            >
              Back to Home
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm text-gray-400 mb-2">Total Alerts</h3>
            <p className="text-3xl font-bold">{stats.totalAlerts}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm text-gray-400 mb-2">Total Filings</h3>
            <p className="text-3xl font-bold">{stats.totalFilings}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm text-gray-400 mb-2">Events</h3>
            <p className="text-3xl font-bold">{events.length}</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Recent Events</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-400">No events yet. Start monitoring to see real-time data.</p>
            ) : (
              events.map((event, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{event.type}</span>
                    <span className="text-sm text-gray-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {event.message && (
                    <p className="text-sm text-gray-300 mt-1">{event.message}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClassicDashboardPage() {
  return (
    <SimpleRealtimeProvider>
      <DashboardContent />
    </SimpleRealtimeProvider>
  );
}