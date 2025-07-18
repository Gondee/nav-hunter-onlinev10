import { NextResponse } from 'next/server';
import { broadcastMonitoringStatus, broadcastLog } from '@/lib/realtime/server';

export const runtime = 'nodejs';

let monitoringActive = false;

export async function POST() {
  try {
    monitoringActive = true;
    
    // Broadcast monitoring status
    broadcastMonitoringStatus({
      isMonitoring: true,
      timestamp: new Date().toISOString()
    });

    broadcastLog('Monitoring started');

    return NextResponse.json({ 
      success: true, 
      message: 'Monitoring started',
      isMonitoring: true 
    });
  } catch (error) {
    console.error('Error starting monitoring:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start monitoring' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ isMonitoring: monitoringActive });
}