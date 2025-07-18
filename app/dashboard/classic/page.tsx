'use client';

export default function ClassicDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">NAV Hunter Dashboard</h1>
      <p className="mb-4">Dashboard is loading...</p>
      <p className="text-sm text-gray-400">If you see this, the dashboard page is working!</p>
      <button 
        onClick={() => window.location.href = '/'}
        className="mt-4 bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
      >
        Back to Home
      </button>
    </div>
  );
}