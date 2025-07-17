import { NextRequest } from 'next/server';
import { 
  broadcastLog, 
  broadcastAILog, 
  broadcastNewAlert,
  getConnectedClientsCount 
} from '@/lib/realtime/server';

export async function GET(request: NextRequest) {
  const clientCount = getConnectedClientsCount();
  
  console.log('[Debug Events] Connected clients:', clientCount);
  
  // Send test events
  broadcastLog('🧪 [DEBUG] Test log message from server', 'info');
  broadcastAILog('🧪 [DEBUG] Test AI log message');
  
  // Send a test alert
  broadcastNewAlert({
    filing: {
      ticker: 'DEBUG',
      companyName: 'Debug Test Company',
      formType: '8-K'
    },
    aiAnalysis: {
      isAlertWorthy: true,
      confidenceScore: 100,
      alertHighlight: true,
      textToSpeak: 'Debug test alert'
    }
  });
  
  return Response.json({
    success: true,
    connectedClients: clientCount,
    message: 'Debug events sent. Check UI terminals.'
  });
}