import { NextRequest } from 'next/server';
import WebSocket from 'ws';
import { broadcastLog, broadcastWSStatus, broadcastMonitoringStatus, broadcastStats, broadcastWSFlash } from '@/lib/realtime/server';
import { createSSEStream } from '@/lib/realtime/server';
// File system operations removed for Vercel compatibility

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Create SSE stream using the realtime server
  const stream = createSSEStream(
    // onConnect
    () => {
      console.log('[SEC Stream] Client connected');
    },
    // onDisconnect  
    () => {
      console.log('[SEC Stream] Client disconnected');
    }
  );

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// WebSocket management
let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isMonitoring = false;

function connectToSEC() {
  if (!process.env.SEC_API_KEY) {
    console.error('SEC_API_KEY not configured');
    broadcastLog('❌ SEC API key not configured in environment variables', 'error');
    return;
  }

  const wsUrl = `${process.env.SEC_WEBSOCKET_URL || 'wss://api.sec-api.io/live?apiKey='}${process.env.SEC_API_KEY}`;
  
  broadcastLog(`🔌 Connecting to SEC WebSocket...`, 'info');
  broadcastLog(`📡 WebSocket URL: ${wsUrl.substring(0, 50)}...`, 'info');
  console.log('[SEC Connect] Attempting connection to:', wsUrl.substring(0, 50) + '...');
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('### SEC Stream Opened ###');
      broadcastWSStatus({ status: 'Live', color: 'var(--accent-green)' });
      broadcastLog('✅ WebSocket connection opened successfully!', 'success');
      broadcastLog('👂 Listening for SEC filings...', 'info');
    };
    
    ws.onmessage = async (event) => {
      try {
        const message = event.data.toString();
        
        // Log raw message for debugging
        console.log('[SEC WebSocket Raw Message]:', message);
        broadcastLog(`📥 Raw SEC data received: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`, 'info');
        
        // Parse the message - it could be an array of filings
        const filings = JSON.parse(message);
        const filingsArray = Array.isArray(filings) ? filings : [filings];
        
        broadcastLog(`📊 Parsed ${filingsArray.length} filing(s) from SEC`, 'info');
        
        // Process each filing
        for (const filing of filingsArray) {
          const formType = filing.formType || 'N/A';
          const ticker = filing.ticker || 'N/A';
          const company = filing.companyName || filing.company || 'Unknown';
          const userConfig = (global as any).userConfig || {};
          const formTypes = userConfig.formTypes || ['8-K', '10-Q', '10-K'];
          
          // Log each filing received
          broadcastLog(`📄 Filing: ${company} (${ticker}) - ${formType}`, 'info');
          console.log('[SEC Filing Details]:', {
            ticker,
            company,
            formType,
            filedAt: filing.filedAt,
            acceptedDate: filing.acceptedDate,
            cik: filing.cik
          });
          
          // Flash WebSocket status
          broadcastWSFlash('', 'success');
          
          // Check if form type matches filter
          const matchesFilter = formTypes.some((baseForm: string) => formType.startsWith(baseForm));
          
          if (matchesFilter) {
            broadcastLog(`✅ [${ticker} - ${formType}] matches filter, processing...`, 'success');
            await processSecFiling(filing);
          } else {
            broadcastLog(`⏭️ [${ticker} - ${formType}] doesn't match filter (looking for: ${formTypes.join(', ')})`, 'warning');
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
        broadcastLog(`❌ Error processing SEC message: ${error}`, 'error');
      }
    };
    
    ws.onerror = (error) => {
      console.error('SEC Stream Error:', error);
      broadcastWSStatus({ status: 'Error', color: 'var(--accent-red)' });
    };
    
    ws.onclose = () => {
      console.log('### SEC Stream Closed ###');
      broadcastWSStatus({ status: 'Off', color: 'var(--text-muted)' });
      
      // Reconnect if monitoring is still active
      if (isMonitoring) {
        broadcastLog('🔌 Attempting to reconnect...', 'warn');
        const delay = parseInt(process.env.SEC_WEBSOCKET_RECONNECT_DELAY || '5000');
        reconnectTimeout = setTimeout(connectToSEC, delay);
      }
    };
  } catch (error) {
    console.error('Failed to connect to SEC WebSocket:', error);
    broadcastLog('Failed to connect to SEC', 'error');
  }
}

async function processSecFiling(filing: any) {
  // Get user config
  const userConfig = (global as any).userConfig || {};
  
  // Update stats
  broadcastStats({ processed: 1 });
  
  // Use the process-filing endpoint to handle the filing
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/sec/process-filing`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Forward auth cookie from stored global config
        'Cookie': (global as any).authCookie || ''
      },
      body: JSON.stringify({ 
        filing: {
          ...filing,
          linkToTxt: filing.linkToTxt || filing.linkToText, // Handle different property names
        },
        config: userConfig 
      })
    });
    
    if (!response.ok) {
      console.error('Failed to process filing');
    }
  } catch (error) {
    console.error('Error processing filing:', error);
  }
}


// API endpoint to control monitoring
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;
  
  switch (action) {
    case 'start':
      if (!isMonitoring) {
        isMonitoring = true;
        // Store user config for AI analysis
        if (body.config) {
          (global as any).userConfig = body.config;
        }
        // Store auth cookie for internal API calls
        (global as any).authCookie = request.headers.get('cookie') || '';
        connectToSEC();
        broadcastMonitoringStatus({ isMonitoring: true });
        return Response.json({ status: 'started' });
      }
      return Response.json({ status: 'already_running' });
      
    case 'stop':
      isMonitoring = false;
      if (ws) {
        ws.close();
        ws = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      broadcastMonitoringStatus({ isMonitoring: false });
      return Response.json({ status: 'stopped' });
      
    case 'status':
      return Response.json({
        isMonitoring,
        connected: ws?.readyState === WebSocket.OPEN,
      });
      
    default:
      return Response.json({ error: 'Invalid action' }, { status: 400 });
  }
}