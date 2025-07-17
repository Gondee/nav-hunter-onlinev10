#!/usr/bin/env node

/**
 * Simple test to verify MSTR ticker test is working
 */

async function testMSTR() {
  console.log('Testing MSTR ticker...\n');
  
  try {
    // First login
    console.log('1. Logging in...');
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'navhunter123' })
    });
    
    if (!response.ok) {
      console.error('Login failed');
      return;
    }
    
    const cookie = response.headers.get('set-cookie')!;
    console.log('Logged in successfully');
    
    // Test the broadcast endpoint
    console.log('\n2. Testing broadcast system...');
    const broadcastRes = await fetch('http://localhost:3000/api/test-broadcast', {
      headers: { 'Cookie': cookie }
    });
    const broadcastResult = await broadcastRes.json();
    console.log('Broadcast test:', broadcastResult);
    
    // Wait a bit for broadcasts to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run ticker test
    console.log('\n3. Testing MSTR ticker search...');
    const tickerRes = await fetch('http://localhost:3000/api/sec/test-ticker', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        ticker: 'MSTR',
        config: {
          formTypes: ['8-K'],
          confidence: 65,
          aiModel: 'gpt-4o-mini',
          aiTemperature: 0.1,
          aiPrompt: `You are an expert financial analyst AI. Your task is to analyze SEC filings for crypto treasury events.

COMPANY: {company} ({ticker})
FORM TYPE: {formType}

Analyze the filing to determine if it contains information about Bitcoin or cryptocurrency purchases. Your response MUST be valid JSON.

Set isAlertWorthy to true ONLY if the filing mentions Bitcoin, cryptocurrency, or digital asset purchases.

Example response for a Bitcoin purchase:
{
  "isAlertWorthy": true,
  "confidenceScore": 95,
  "alertHighlight": true,
  "textToSpeak": "Alert on ticker M S T R. Bitcoin purchase detected.",
  "analysis": "Company purchased Bitcoin for treasury"
}`
        }
      })
    });
    
    const tickerResult = await tickerRes.json();
    console.log('\nTicker test result:', tickerResult);
    
    // Wait for processing
    console.log('\nWaiting 30 seconds for filing processing...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log('\nTest complete. Check the server console and UI for:');
    console.log('- Filing fetch logs');
    console.log('- AI analysis logs');
    console.log('- Alert generation');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMSTR();