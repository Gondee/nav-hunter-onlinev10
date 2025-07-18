'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(password);
      
      if (!success) {
        setError('Invalid password. Please try again.');
      }
      // If successful, the login function handles navigation
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a1d' }}>
      <div className="w-full max-w-md p-8 rounded-lg shadow-xl" style={{ backgroundColor: '#2c2c34' }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: '#e1e1e1' }}>
            NAV-Hunter Online
          </h1>
          <p className="text-center" style={{ color: '#8a8d93' }}>
            Enter your password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#e1e1e1' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-[#4a90e2] transition-colors"
              style={{ 
                backgroundColor: '#1a1a1d',
                borderColor: '#3a3a44',
                color: '#e1e1e1'
              }}
              placeholder="Enter password"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div 
              className="p-3 rounded-md text-sm"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:ring-offset-2 focus:ring-offset-[#2c2c34] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: '#4a90e2',
              color: '#ffffff'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#357abd';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4a90e2';
            }}
          >
            {isLoading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: '#8a8d93' }}>
            Secure authentication required
          </p>
        </div>
      </div>
    </div>
  );
}