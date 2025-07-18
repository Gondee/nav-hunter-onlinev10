import { NextResponse } from 'next/server';
import { broadcastMonitoringStatus, broadcastLog } from '@/lib/realtime/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    // Broadcast monitoring status
    broadcastMonitoringStatus({
      isMonitoring: false,
      timestamp: new Date().toISOString()
    });

    broadcastLog('Monitoring stopped');

    return NextResponse.json({ 
      success: true, 
      message: 'Monitoring stopped',
      isMonitoring: false 
    });
  } catch (error) {
    console.error('Error stopping monitoring:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop monitoring' },
      { status: 500 }
    );
  }
}