import { NextResponse } from 'next/server';
import { broadcastLog } from '@/lib/realtime/server';

export const runtime = 'nodejs';

export async function GET() {
  const hasApiKey = !!process.env.SEC_API_KEY;
  const wsUrl = process.env.SEC_WEBSOCKET_URL || 'wss://api.sec-api.io/live?apiKey=';
  
  if (hasApiKey) {
    broadcastLog('✅ SEC API key is configured', 'success');
    broadcastLog(`📡 WebSocket URL base: ${wsUrl}`, 'info');
  } else {
    broadcastLog('❌ SEC API key is NOT configured', 'error');
    broadcastLog('Please set SEC_API_KEY in your environment variables', 'error');
  }
  
  return NextResponse.json({
    hasApiKey,
    wsUrl,
    message: hasApiKey ? 'SEC API key is configured' : 'SEC API key is missing'
  });
}