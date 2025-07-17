#!/usr/bin/env node

/**
 * Test case for MSTR ticker with mocked AI response
 */

async function login(): Promise<string> {
  console.log('Logging in...');
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'navhunter123' })
  });
  
  if (!response.ok) {
    throw new Error('Login failed');
  }
  
  // Extract auth token from cookies
  const cookies = response.headers.get('set-cookie');
  if (!cookies) {
    throw new Error('No auth cookie received');
  }
  
  return cookies;
}

async function testMSTR() {
  console.log('Starting MSTR test case (with mocked AI)...\n');
  
  // Login first
  let authCookie: string;
  try {
    authCookie = await login();
    console.log('Login successful\n');
  } catch (error) {
    console.error('Login failed:', error);
    return;
  }
  
  try {
    // Test the SEC ticker API directly
    console.log('Testing SEC API ticker search for MSTR...');
    const tickerResponse = await fetch('http://localhost:3000/api/sec/test-ticker', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        ticker: 'MSTR',
        config: {
          formTypes: ['8-K', '10-Q', '10-K'],
          confidence: 65,
          secApiKey: process.env.SEC_API_KEY || '',
          // Skip OpenAI for now
          skipAI: true
        }
      })
    });
    
    if (!tickerResponse.ok) {
      const error = await tickerResponse.text();
      console.error('Ticker test failed:', error);
      return;
    }
    
    const tickerResult = await tickerResponse.json();
    console.log('\nTicker Test Result:');
    console.log('Total filings found:', tickerResult.total);
    console.log('Processing status:', tickerResult.message);
    
    if (tickerResult.filings && tickerResult.filings.length > 0) {
      console.log('\nFirst 3 filings:');
      tickerResult.filings.slice(0, 3).forEach((filing: any, i: number) => {
        console.log(`\n${i + 1}. ${filing.ticker} - ${filing.formType}`);
        console.log(`   Date: ${new Date(filing.filedAt).toLocaleDateString()}`);
        console.log(`   Company: ${filing.companyName}`);
        if (filing.linkToHtml) {
          console.log(`   Link: ${filing.linkToHtml}`);
        }
      });
    }
    
    // Test WebSocket status
    console.log('\n\nChecking WebSocket monitoring status...');
    const statusResponse = await fetch('http://localhost:3000/api/sec/stream', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({ action: 'status' })
    });
    
    const status = await statusResponse.json();
    console.log('Monitoring active:', status.isMonitoring);
    console.log('WebSocket connected:', status.connected);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Check if SEC API key is set
if (!process.env.SEC_API_KEY) {
  console.error('Error: SEC_API_KEY environment variable not set');
  console.log('Please set: export SEC_API_KEY=your-key-here');
  process.exit(1);
}

// Run the test
testMSTR().then(() => {
  console.log('\nTest completed');
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});