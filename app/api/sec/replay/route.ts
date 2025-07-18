import { NextRequest } from 'next/server';
import { broadcastLog, broadcastReplayFinished } from '@/lib/realtime/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json();
    
    // Replay functionality disabled for Vercel deployment
    // In production, this would read from a database or external storage
    broadcastLog('⚠️ Replay functionality is currently disabled on Vercel deployment', 'warn');
    broadcastLog('File system operations are not supported in serverless environment', 'info');
    
    // Send completion message immediately
    broadcastReplayFinished(true, 0, ['Replay disabled on Vercel']);
    
    return Response.json({ 
      success: true,
      message: 'Replay functionality disabled for serverless deployment' 
    });
  } catch (error) {
    console.error('[Replay] Error:', error);
    return Response.json({ 
      error: 'Failed to process replay request' 
    }, { status: 500 });
  }
}