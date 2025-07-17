#!/usr/bin/env node

/**
 * Test filing processing directly with a mock filing
 */

async function testProcessingDirect() {
  console.log('Testing filing processing directly...\n');
  
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
    
    // Create a mock filing based on MSTR's typical structure
    const mockFiling = {
      ticker: 'MSTR',
      companyName: 'MicroStrategy Inc',
      formType: '8-K',
      filedAt: '2024-11-18T16:30:00',
      linkToTxt: 'https://www.sec.gov/Archives/edgar/data/1050446/000105044624000244/0001050446-24-000244.txt',
      linkToHtml: 'https://www.sec.gov/Archives/edgar/data/1050446/000105044624000244/0001050446-24-000244-index.htm',
      linkToFilingDetails: 'https://www.sec.gov/Archives/edgar/data/1050446/000105044624000244/0001050446-24-000244-index.htm',
      description: 'Form 8-K - Current report'
    };
    
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

Example response for a Bitcoin purchase:
{
  "isAlertWorthy": true,
  "confidenceScore": 95,
  "alertHighlight": true,  
  "textToSpeak": "Alert on ticker M S T R. Bitcoin purchase detected.",
  "analysis": "Company purchased Bitcoin for treasury"
}`
    };
    
    console.log('\n2. Processing mock MSTR filing...');
    const processRes = await fetch('http://localhost:3000/api/sec/process-filing', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ filing: mockFiling, config })
    });
    
    console.log('Process response status:', processRes.status);
    
    if (processRes.ok) {
      const result = await processRes.json();
      console.log('Process result:', result);
    } else {
      const error = await processRes.text();
      console.error('Process failed:', error);
    }
    
    // Wait for processing
    console.log('\nWaiting 10 seconds for processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\nTest complete. Check the UI for:');
    console.log('- Filing fetch logs in left terminal');
    console.log('- AI analysis logs in right terminal'); 
    console.log('- Alert generation');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProcessingDirect();