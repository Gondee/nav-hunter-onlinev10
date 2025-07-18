'use client';

import { useState, useEffect } from 'react';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { ClassicDashboard } from '@/components/dashboard/ClassicDashboard';

export default function ClassicDashboardPage() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const handleLogout = async () => {
    // No auth - just redirect to home
    window.location.href = '/';
  };

  useEffect(() => {
    // Enable audio on any click
    const enableAudio = () => {
      setAudioEnabled(true);
      document.getElementById('audio-prompt')?.style.setProperty('display', 'none');
    };
    
    document.addEventListener('click', enableAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', enableAudio);
    };
  }, []);

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-gray-900">
        {!audioEnabled && (
          <div 
            id="audio-prompt"
            className="fixed top-0 left-0 right-0 bg-amber-600 text-white text-center py-2 z-50"
          >
            Click anywhere to enable audio alerts
          </div>
        )}
        <ClassicDashboard onLogout={handleLogout} />
      </div>
    </RealtimeProvider>
  );
}