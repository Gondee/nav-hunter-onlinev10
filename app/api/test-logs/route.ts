import { NextRequest } from 'next/server';
import { broadcastLog } from '@/lib/realtime/server';

export async function GET(request: NextRequest) {
  console.log('=== TEST LOG: Broadcasting test messages ===');
  
  // Broadcast different types of logs
  broadcastLog('📝 Test log message - INFO level', 'info');
  broadcastLog('⚠️ Test log message - WARNING level', 'warning');
  broadcastLog('❌ Test log message - ERROR level', 'error');
  broadcastLog('✅ Test log message - SUCCESS level', 'success');
  broadcastLog('🔍 Test log message - No level specified');
  
  return Response.json({ 
    message: 'Test logs broadcasted - check System Logs panel',
    timestamp: new Date().toISOString()
  });
}