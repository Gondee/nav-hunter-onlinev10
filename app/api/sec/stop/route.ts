import { NextResponse } from 'next/server';
import { broadcastMonitoringStatus, broadcastLog } from '@/lib/realtime/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    broadcastLog('🛑 Stopping SEC monitoring...', 'info');
    
    // Stop the WebSocket connection
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/sec/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stop'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to stop WebSocket connection');
    }

    // Broadcast monitoring status
    broadcastMonitoringStatus({
      isMonitoring: false,
      timestamp: new Date().toISOString()
    });

    broadcastLog('✅ SEC monitoring stopped', 'success');

    return NextResponse.json({ 
      success: true, 
      message: 'Monitoring stopped',
      isMonitoring: false 
    });
  } catch (error) {
    console.error('Error stopping monitoring:', error);
    broadcastLog(`❌ Failed to stop monitoring: ${error}`, 'error');
    return NextResponse.json(
      { success: false, error: 'Failed to stop monitoring' },
      { status: 500 }
    );
  }
}