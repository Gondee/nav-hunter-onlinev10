import { NextRequest } from 'next/server';
import { broadcastLog, broadcast, broadcastTestFinished } from '@/lib/realtime/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let ticker: string | undefined;
  
  try {
    const body = await request.json();
    ticker = body.ticker;
    const config = body.config;
    
    if (!ticker) {
      return Response.json({ error: 'Ticker required' }, { status: 400 });
    }
    
    const apiKey = config?.secApiKey || process.env.SEC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'SEC API key not configured' }, { status: 400 });
    }
    
    // Import sec-api dynamically
    const secApi = (await import('sec-api')).default;
    
    // Set the API key (JavaScript pattern is different from Python)
    secApi.setApiKey(apiKey);
    
    // Search for filings in the last 180 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 180);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const formTypes = config?.formTypes || ['8-K', '10-Q', '10-K'];
    const formQuery = formTypes.map((f: string) => `"${f}"`).join(' OR ');
    const queryString = `ticker:${ticker} AND formType:(${formQuery}) AND filedAt:[${startDateStr} TO *]`;
    
    const query = {
      query: { 
        query_string: { 
          query: queryString
        } 
      },
      from: "0",
      size: "25",
      sort: [{ filedAt: { order: "desc" } }]
    };
    
    // Send initial log message
    broadcastLog(`--- Starting FULL test for [${ticker}] ---`, 'warn');
    
    const queryResult = await secApi.queryApi.getFilings(query);
    
    if (queryResult.filings && queryResult.filings.length > 0) {
      const filingsToProcess = queryResult.filings.slice(0, 25); // Process up to 25
      const totalValue = queryResult.total?.value || queryResult.filings.length;
      
      broadcastLog(`Found ${totalValue} filings for ${ticker}. Processing up to ${filingsToProcess.length} of them...`, 'info');
      
      // Process each filing
      for (let i = 0; i < filingsToProcess.length; i++) {
        const filing = filingsToProcess[i];
        const filingDate = filing.filedAt?.split('T')[0] || 'N/A';
        
        // Log filing structure to UI
        broadcastLog(`📄 Filing #${i+1} for ${filing.ticker}:`, 'info');
        broadcastLog(`  Form: ${filing.formType} | Date: ${filing.filedAt}`, 'info');
        broadcastLog(`  Company: ${filing.companyName}`, 'info');
        
        // Also log to console for debugging
        console.log('\n[Ticker Test] Filing #' + (i+1) + ' structure:');
        console.log('  All keys:', Object.keys(filing));
        
        broadcastLog(`--- Processing filing ${i + 1} of ${filingsToProcess.length} (${filing.formType} filed on ${filingDate}) ---`, 'info');
        
        broadcastLog(`🔄 Processing filing ${i + 1}/${filingsToProcess.length} for ${filing.ticker}`, 'info');
        
        // Log config details
        if (config) {
          broadcastLog(`⚙️ Config: Forms [${config.formTypes?.join(', ')}] | Threshold: ${config.confidenceThreshold}%`, 'info');
        }
        
        // Process the filing using direct module import
        const processFilingModule = await import('../process-filing/route');
        
        // Create a mock request for the process-filing handler
        const mockRequest = new Request('http://localhost/api/sec/process-filing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({ filing, config })
        });
        
        const response = await processFilingModule.POST(mockRequest as any);
        broadcastLog(`📡 Response status: ${response.status}`, 'info');
        
        if (!response.ok) {
          const errorText = await response.text();
          broadcastLog(`❌ Failed to process filing: ${errorText}`, 'error');
        } else {
          // Read the response body once
          const responseText = await response.text();
          try {
            const result = JSON.parse(responseText);
            if (result.alert) {
              broadcastLog(`🎯 Alert generated! Confidence: ${result.confidence || 'N/A'}%`, 'success');
              if (result.analysis?.summary) {
                broadcastLog(`💡 ${result.analysis.summary}`, 'info');
              }
            } else {
              broadcastLog(`⏭️ No alert for filing ${i + 1} - did not meet criteria`, 'info');
            }
          } catch (parseError) {
            broadcastLog(`⚠️ Could not parse response for filing ${i + 1}`, 'warning');
          }
        }
        broadcastLog(`✅ Completed filing ${i + 1}/${filingsToProcess.length}`, 'info');
        
        // Small delay between filings
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      broadcastLog(`🏁 Test complete for ${ticker} - Processed ${filingsToProcess.length} filings`, 'success');
      broadcastTestFinished(ticker, true);
      
      return Response.json({ 
        success: true, 
        message: `Found ${totalValue} filings for ${ticker}`,
        filings: filingsToProcess.length 
      });
    } else {
      broadcastLog(`❌ No relevant filings found for ${ticker} in the last 6 months.`, 'warning');
      
      broadcastLog(`🏁 Test complete for ${ticker} - No filings to process`, 'info');
      broadcastTestFinished(ticker, false);
      
      return Response.json({ 
        success: false, 
        message: `No recent filings found for ${ticker}` 
      });
    }
  } catch (error: any) {
    console.error('Test ticker error:', error);
    broadcastLog(`❌ Ticker Test failed: ${error.message || error}`, 'error');
    
    broadcastTestFinished(ticker || 'UNKNOWN', false);
    
    return Response.json(
      { error: error.message || 'Failed to test ticker' },
      { status: 500 }
    );
  }
}