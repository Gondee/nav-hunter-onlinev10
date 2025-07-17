#!/usr/bin/env node

/**
 * Test a single ticker with full server-side logging
 */

async function testSingleTicker() {
  console.log('\n=== TESTING SINGLE TICKER ===\n');
  
  try {
    // Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'navhunter123' })
    });
    
    if (!loginRes.ok) {
      console.error('Login failed');
      return;
    }
    
    const cookie = loginRes.headers.get('set-cookie')!;
    console.log('✅ Logged in\n');
    
    // Test with a known ticker
    const config = {
      formTypes: ['8-K'],
      confidence: 65,
      aiModel: 'gpt-4o-mini',
      aiTemperature: 0.1,
      aiPrompt: `You are an expert financial analyst AI. Your task is to analyze SEC filings for crypto treasury events.

COMPANY: {company} ({ticker})
FORM TYPE: {formType}

Analyze the filing to determine if it contains information about Bitcoin or cryptocurrency purchases. Your response MUST be valid JSON.

Set isAlertWorthy to true ONLY if the filing mentions Bitcoin, cryptocurrency, or digital asset purchases.

Example response:
{
  "isAlertWorthy": true,
  "confidenceScore": 95,
  "alertHighlight": true,
  "textToSpeak": "Alert on ticker M S T R. Bitcoin purchase detected.",
  "analysis": "Company purchased Bitcoin for treasury"
}`
    };
    
    console.log('📊 Testing ticker: MSTR\n');
    console.log('This will process REAL SEC filings.');
    console.log('Watch your SERVER CONSOLE for detailed logs.\n');
    
    const tickerRes = await fetch('http://localhost:3000/api/sec/test-ticker', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        ticker: 'MSTR',
        config: config
      })
    });
    
    console.log('Response status:', tickerRes.status);
    console.log('Response headers:', tickerRes.headers);
    
    // Try to parse response
    const contentType = tickerRes.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (contentType?.includes('application/json')) {
      try {
        const result = await tickerRes.json();
        console.log('\nResult:', JSON.stringify(result, null, 2));
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        const text = await tickerRes.text();
        console.log('Raw response:', text.substring(0, 200));
      }
    } else {
      const text = await tickerRes.text();
      console.log('Non-JSON response:', text.substring(0, 200));
    }
    
    console.log('\n=== IMPORTANT ===');
    console.log('Check your SERVER CONSOLE for:');
    console.log('1. [Process Filing] logs');
    console.log('2. [fetchAndStripHtml] logs');
    console.log('3. === OPENAI REQUEST ===');
    console.log('4. === OPENAI RESPONSE ===');
    console.log('\nIf you see "0 clients" in broadcasts, the UI is not connected.');
    console.log('Make sure the dashboard is open in your browser BEFORE running tests.');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testSingleTicker();