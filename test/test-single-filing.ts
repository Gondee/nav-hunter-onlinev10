#!/usr/bin/env node

/**
 * Test processing a single filing with full debugging
 */

async function testSingleFiling() {
  console.log('=== SINGLE FILING TEST ===\n');
  
  try {
    // Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'navhunter123' })
    });
    
    const cookie = loginRes.headers.get('set-cookie')!;
    console.log('✅ Logged in\n');
    
    // Create a mock filing with known URLs
    const mockFiling = {
      ticker: 'MSTR',
      companyName: 'MicroStrategy Inc',
      formType: '8-K',
      filedAt: '2024-11-18T16:30:00',
      linkToTxt: 'https://www.sec.gov/Archives/edgar/data/1050446/000119312524262254/d897196d8k.txt',
      linkToFilingDetails: 'https://www.sec.gov/Archives/edgar/data/1050446/000119312524262254/d897196d8k-index.htm',
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

Example response:
{
  "isAlertWorthy": true,
  "confidenceScore": 95,
  "alertHighlight": true,
  "textToSpeak": "Alert on ticker M S T R. Bitcoin purchase detected.",
  "analysis": "Company purchased Bitcoin for treasury"
}`
    };
    
    console.log('📄 Processing single filing...\n');
    
    const processRes = await fetch('http://localhost:3000/api/sec/process-filing', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ filing: mockFiling, config })
    });
    
    console.log('Response status:', processRes.status);
    
    if (processRes.ok) {
      const result = await processRes.json();
      console.log('Result:', result);
    } else {
      const error = await processRes.text();
      console.error('Error:', error);
    }
    
    console.log('\n⏳ Waiting 10 seconds to see logs...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('✅ Test complete\n');
    console.log('Check the SERVER CONSOLE for:');
    console.log('- [Process Filing] logs');
    console.log('- [fetchAndStripHtml] logs');
    console.log('- === OPENAI REQUEST === section');
    console.log('- === OPENAI RESPONSE === section');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSingleFiling();