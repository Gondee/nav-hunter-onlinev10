import { NextRequest } from 'next/server';
import { broadcastLog, broadcastAILog, broadcastNewAlert } from '@/lib/realtime/server';

export async function GET(request: NextRequest) {
  console.log('[Test Broadcast] Starting broadcast test...');
  
  // Test regular log
  broadcastLog('Test log message from server', 'info');
  
  // Test AI log
  broadcastAILog('Test AI analysis message');
  
  // Test alert
  broadcastNewAlert({
    filing: {
      ticker: 'TEST',
      companyName: 'Test Company',
      formType: '8-K'
    },
    aiAnalysis: {
      isAlertWorthy: true,
      confidenceScore: 95,
      alertHighlight: true,
      textToSpeak: 'Test alert'
    }
  });
  
  return Response.json({ 
    success: true, 
    message: 'Test broadcasts sent. Check console and UI.' 
  });
}