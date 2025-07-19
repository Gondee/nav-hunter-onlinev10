import { NextResponse } from 'next/server';
import { broadcastMonitoringStatus, broadcastLog } from '@/lib/realtime/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    broadcastLog('🛑 Stopping SEC monitoring...', 'info');
    
    // Import the stream module directly
    const streamModule = await import('../stream/route');
    
    // Call the POST handler directly
    const mockRequest = new Request('http://localhost/api/sec/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stop'
      })
    });
    
    const result = await streamModule.POST(mockRequest as any);
    const data = await result.json();
    
    if (data.status !== 'stopped') {
      throw new Error('Failed to stop monitoring');
    }

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
      { success: false, error: `Failed to stop monitoring: ${error}` },
      { status: 500 }
    );
  }
}