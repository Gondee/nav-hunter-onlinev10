#!/usr/bin/env node

/**
 * Test with a known MSTR filing that should trigger an alert
 */

async function testKnownAlert() {
  console.log('Testing with known MSTR Bitcoin purchase filing...\n');
  
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
    
    // Create a mock filing that represents a Bitcoin purchase
    const mockFiling = {
      ticker: 'MSTR',
      companyName: 'MicroStrategy Inc',
      formType: '8-K',
      filedAt: '2024-11-18T16:30:00',
      linkToTxt: 'https://www.sec.gov/Archives/edgar/data/1050446/000119312524000001/d123456d8k.txt',
      linkToHtml: 'https://www.sec.gov/Archives/edgar/data/1050446/000119312524000001/d123456d8k.htm',
      linkToFilingDetails: 'https://www.sec.gov/Archives/edgar/data/1050446/000119312524000001/d123456d8k-index.htm',
      description: 'Form 8-K - Bitcoin Purchase Announcement'
    };
    
    const config = {
      formTypes: ['8-K'],
      confidence: 65,
      aiModel: 'gpt-4o-mini',
      aiTemperature: 0.1,
      aiPrompt: `You are an expert financial analyst AI. Your task is to analyze SEC filings for crypto treasury events.

COMPANY: {company} ({ticker})
FORM TYPE: {formType}

For testing purposes, treat this as a Bitcoin purchase announcement. Respond with:

{
  "isAlertWorthy": true,
  "confidenceScore": 95,
  "alertHighlight": true,
  "textToSpeak": "Alert on ticker M S T R. Bitcoin purchase detected. MicroStrategy purchased 10,000 Bitcoin.",
  "isChinese": false,
  "investors": "Michael Saylor, Pantera Capital",
  "RaiseOrAnnouncment": "Yes, actual purchase confirmed",
  "Event Type": "Crypto Treasury Purchase", 
  "Asset": "Bitcoin (BTC)",
  "Key Quote": "MicroStrategy announced the purchase of 10,000 Bitcoin for approximately $500 million."
}`
    };
    
    console.log('\n2. Sending test broadcast to check connection...');
    const broadcastRes = await fetch('http://localhost:3000/api/test-broadcast', {
      headers: { 'Cookie': cookie }
    });
    const broadcastResult = await broadcastRes.json();
    console.log('Broadcast test:', broadcastResult);
    
    // Wait for broadcast to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n3. Processing mock Bitcoin purchase filing...');
    const processRes = await fetch('http://localhost:3000/api/sec/process-filing', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ 
        filing: mockFiling, 
        config 
      })
    });
    
    console.log('Process response status:', processRes.status);
    
    if (processRes.ok) {
      const result = await processRes.json();
      console.log('Process result:', result);
    } else {
      const error = await processRes.text();
      console.error('Process failed:', error);
    }
    
    console.log('\n4. Waiting 5 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\nTest complete. Check the browser for:');
    console.log('- AI Analysis Terminal (right side) - should show analysis');
    console.log('- Alerts tab - should show a gold alert');
    console.log('- Browser console - should show event logs');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testKnownAlert();