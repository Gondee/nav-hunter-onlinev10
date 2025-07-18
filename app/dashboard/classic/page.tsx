'use client';

export default function ClassicDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">NAV Hunter Dashboard</h1>
        <p className="text-gray-400 mb-4">Dashboard is working!</p>
        <a 
          href="/"
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}