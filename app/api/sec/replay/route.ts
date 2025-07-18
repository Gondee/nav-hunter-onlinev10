import { NextRequest } from 'next/server';
import { broadcastLog, broadcastReplayFinished, broadcastStats } from '@/lib/realtime/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json();
    
    // Read the log file
    const logPath = join(process.cwd(), 'websocket_stream.log');
    let logContent: string;
    
    try {
      logContent = await readFile(logPath, 'utf-8');
    } catch (error) {
      return Response.json({ 
        error: 'Log file not found. Make sure websocket_stream.log exists in the project root.' 
      }, { status: 404 });
    }
    
    // Parse log entries
    const lines = logContent.split('\n').filter(line => line.trim());
    let processedCount = 0;
    
    broadcastLog(`⟳ Starting replay of ${lines.length} log entries...`, 'warn');
    
    // Process each line with a delay to simulate real-time
    for (const line of lines) {
      try {
        // Parse the JSON from log line
        const filing = JSON.parse(line);
        
        // Process the filing
        await processFilingForReplay(filing, config, request);
        processedCount++;
        
        // Add a small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('Error processing log line:', error);
      }
    }
    
    broadcastLog(`⟳ Replay complete. Processed ${processedCount} entries.`, 'warn');
    
    // Signal replay finished
    broadcastReplayFinished(true);
    
    return Response.json({ 
      success: true, 
      processed: processedCount,
      total: lines.length 
    });
    
  } catch (error: any) {
    console.error('Replay error:', error);
    broadcastReplayFinished(true);
    return Response.json(
      { error: error.message || 'Failed to replay log file' },
      { status: 500 }
    );
  }
}

async function processFilingForReplay(filing: any, config: any, request: NextRequest) {
  // Broadcast the filing
  broadcastLog(`📄 Replaying: ${filing.ticker} - ${filing.formType}`, 'info');
  
  // Update stats
  broadcastStats({ processed: 1 });
  
  // Check if we should analyze this filing
  const formTypes = config?.formTypes || ['8-K', '10-Q', '10-K'];
  
  if (!formTypes.includes(filing.formType)) {
    broadcastLog(`⏭️ Skipping ${filing.formType} (not selected)`, 'skipped');
    return;
  }
  
  // Use the process-filing endpoint to handle the filing
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/sec/process-filing`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Forward auth cookie from the replay request
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({ filing, config })
    });
    
    if (!response.ok) {
      console.error('Failed to process filing');
    }
  } catch (error) {
    console.error('Error processing filing:', error);
  }
}