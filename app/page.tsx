import Link from 'next/link';

// Server component - no 'use client' directive
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">NAV Hunter Online</h1>
        <p className="mb-8">Real-time SEC filing monitoring system</p>
        <Link 
          href="/dashboard/classic" 
          className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}