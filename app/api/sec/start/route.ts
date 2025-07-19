import { NextResponse } from 'next/server';
import { broadcastMonitoringStatus, broadcastLog } from '@/lib/realtime/server';

export const runtime = 'nodejs';

let monitoringActive = false;

export async function POST() {
  try {
    monitoringActive = true;
    
    broadcastLog('🚀 Starting SEC monitoring...', 'info');
    
    // Start the actual WebSocket connection
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/sec/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'start',
        config: {
          formTypes: ['8-K', '10-Q', '10-K', '6-K', '20-F']
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to start WebSocket connection');
    }

    // Broadcast monitoring status
    broadcastMonitoringStatus({
      isMonitoring: true,
      timestamp: new Date().toISOString()
    });

    broadcastLog('✅ SEC monitoring started successfully', 'success');

    return NextResponse.json({ 
      success: true, 
      message: 'Monitoring started',
      isMonitoring: true 
    });
  } catch (error) {
    console.error('Error starting monitoring:', error);
    broadcastLog(`❌ Failed to start monitoring: ${error}`, 'error');
    return NextResponse.json(
      { success: false, error: 'Failed to start monitoring' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ isMonitoring: monitoringActive });
}