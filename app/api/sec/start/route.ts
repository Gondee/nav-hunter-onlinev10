import { NextResponse } from 'next/server';
import { broadcastMonitoringStatus, broadcastLog } from '@/lib/realtime/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    broadcastLog('🚀 Starting SEC monitoring...', 'info');
    
    // Import the stream module directly to avoid circular requests
    const streamModule = await import('../stream/route');
    
    // Call the POST handler directly
    const mockRequest = new Request('http://localhost/api/sec/stream', {
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
    
    const result = await streamModule.POST(mockRequest as any);
    const data = await result.json();
    
    if (data.status !== 'started' && data.status !== 'already_running') {
      throw new Error('Failed to start monitoring');
    }

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
      { success: false, error: `Failed to start monitoring: ${error}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Get monitoring status from the stream module
  try {
    const streamModule = await import('../stream/route');
    // This is a simple placeholder - actual status should come from global state
    return NextResponse.json({ isMonitoring: false });
  } catch (error) {
    return NextResponse.json({ isMonitoring: false });
  }
}