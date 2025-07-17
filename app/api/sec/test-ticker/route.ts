import { NextRequest } from 'next/server';
import { broadcastLog, broadcast, broadcastTestFinished } from '@/lib/realtime/server';

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
        
        // Log filing structure to debug
        console.log('\n[Ticker Test] Filing #' + (i+1) + ' structure:');
        console.log('  ticker:', filing.ticker);
        console.log('  formType:', filing.formType);
        console.log('  filedAt:', filing.filedAt);
        console.log('  companyName:', filing.companyName);
        console.log('  linkToTxt:', filing.linkToTxt || 'NOT PRESENT');
        console.log('  linkToText:', filing.linkToText || 'NOT PRESENT');
        console.log('  linkToHtml:', filing.linkToHtml || 'NOT PRESENT');
        console.log('  linkToFilingDetails:', filing.linkToFilingDetails || 'NOT PRESENT');
        console.log('  documentFormatFiles:', filing.documentFormatFiles ? 'PRESENT' : 'NOT PRESENT');
        console.log('  All keys:', Object.keys(filing));
        
        broadcastLog(`--- Processing filing ${i + 1} of ${filingsToProcess.length} (${filing.formType} filed on ${filingDate}) ---`, 'info');
        
        console.log(`\n[Ticker Test] === PROCESSING FILING ${i + 1} ===`);
        console.log('[Ticker Test] Calling process-filing for:', filing.ticker);
        console.log('[Ticker Test] Config being sent:', {
          formTypes: config?.formTypes,
          hasPrompt: !!config?.aiPrompt,
          promptLength: config?.aiPrompt?.length,
          model: config?.aiModel
        });
        
        // Process the filing - IMPORTANT: Include auth headers from the original request
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/sec/process-filing`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            // Forward the auth cookie from the incoming request
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({ filing, config })
        });
        
        console.log('[Ticker Test] Process filing response:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Ticker Test] Failed to process filing:', errorText);
        } else {
          // Read the response body once
          const responseText = await response.text();
          try {
            const result = JSON.parse(responseText);
            console.log('[Ticker Test] Process filing result:', result);
          } catch (parseError) {
            console.log('[Ticker Test] Failed to parse process response as JSON');
            console.log('[Ticker Test] Response text:', responseText.substring(0, 200));
          }
        }
        console.log(`[Ticker Test] === END FILING ${i + 1} ===\n`);
        
        // Small delay between filings
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      broadcastLog(`--- Test for [${ticker}] Complete ---`, 'warn');
      broadcastTestFinished(ticker, true);
      
      return Response.json({ 
        success: true, 
        message: `Found ${totalValue} filings for ${ticker}`,
        filings: filingsToProcess.length 
      });
    } else {
      broadcastLog(`No relevant filings found for ${ticker} in the last 6 months.`, 'info');
      
      broadcastLog(`--- Test for [${ticker}] Complete ---`, 'warn');
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