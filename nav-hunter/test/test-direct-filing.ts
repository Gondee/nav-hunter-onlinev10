#!/usr/bin/env node

/**
 * Test filing processing directly to see where it fails
 */

async function testDirectFiling() {
  console.log('\n=== DIRECT FILING TEST ===\n');
  
  try {
    // Get a real MSTR filing from SEC API
    const secApi = (await import('sec-api')).default;
    const apiKey = '3161badc9a49d43da4c9db92d17e1213026a0f70df0fdabae4eaf7812f5188b3';
    secApi.setApiKey(apiKey);
    
    console.log('1. Fetching latest MSTR 8-K filing...');
    
    const query = {
      query: { 
        query_string: { 
          query: 'ticker:MSTR AND formType:"8-K"'
        } 
      },
      from: "0",
      size: "1",
      sort: [{ filedAt: { order: "desc" } }]
    };
    
    const result = await secApi.queryApi.getFilings(query);
    
    if (!result.filings || result.filings.length === 0) {
      console.error('No filings found');
      return;
    }
    
    const filing = result.filings[0];
    console.log('\nFiling found:');
    console.log('- Ticker:', filing.ticker);
    console.log('- Date:', filing.filedAt);
    console.log('- Has linkToTxt:', !!filing.linkToTxt);
    console.log('- Has linkToFilingDetails:', !!filing.linkToFilingDetails);
    
    // Login
    console.log('\n2. Logging in...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'navhunter123' })
    });
    
    const cookie = loginRes.headers.get('set-cookie')!;
    
    // Process this specific filing
    console.log('\n3. Processing filing through /api/sec/process-filing...');
    
    const config = {
      formTypes: ['8-K'],
      confidence: 65,
      aiModel: 'gpt-4o-mini',
      aiTemperature: 0.1,
      aiPrompt: `You are an expert financial analyst AI. Analyze this filing.

COMPANY: {company} ({ticker})
FORM TYPE: {formType}

If the filing mentions Bitcoin or cryptocurrency, respond with:
{
  "isAlertWorthy": true,
  "confidenceScore": 95,
  "alertHighlight": true,
  "textToSpeak": "Alert on ticker M S T R. Bitcoin purchase detected.",
  "analysis": "Company purchased Bitcoin"
}

Otherwise respond with:
{
  "isAlertWorthy": false,
  "confidenceScore": 50,
  "analysis": "No crypto activity"
}`
    };
    
    const processRes = await fetch('http://localhost:3000/api/sec/process-filing', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ filing, config })
    });
    
    console.log('\nProcess response status:', processRes.status);
    
    if (processRes.ok) {
      const result = await processRes.json();
      console.log('Process result:', result);
    } else {
      const error = await processRes.text();
      console.error('Process error:', error);
    }
    
    console.log('\n=== CHECK SERVER CONSOLE ===');
    console.log('You should see in order:');
    console.log('1. [Process Filing] ========== START ==========');
    console.log('2. [fetchAndStripHtml] Fetching URL');
    console.log('3. [Process Filing] Total content for analysis: X chars');
    console.log('4. [Process Filing] === CALLING AI ANALYSIS ===');
    console.log('5. === OPENAI REQUEST ===');
    console.log('6. === OPENAI RESPONSE ===');
    console.log('\nIf any of these are missing, that shows where the process fails.');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testDirectFiling();