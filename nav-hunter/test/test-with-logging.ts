#!/usr/bin/env node

/**
 * Test with inline logging capture
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runTest() {
  console.log('Starting test with log monitoring...\n');
  
  try {
    // First, clear any existing logs
    console.log('=== STARTING FRESH TEST ===\n');
    
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
    console.log('✅ Logged in successfully\n');
    
    // Test direct AI analysis first
    console.log('1. Testing AI endpoint directly...');
    const testPrompt = `Test prompt. Respond with JSON: {"isAlertWorthy": true, "confidenceScore": 95, "analysis": "test"}`;
    
    const aiTestRes = await fetch('http://localhost:3000/api/ai/analyze', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        filing: { ticker: 'TEST', companyName: 'Test Co', formType: '8-K' },
        config: { aiModel: 'gpt-4o-mini' },
        prompt: testPrompt
      })
    });
    
    console.log('AI test response status:', aiTestRes.status);
    if (aiTestRes.ok) {
      const aiResult = await aiTestRes.json();
      console.log('AI test result:', aiResult);
    } else {
      console.error('AI test failed:', await aiTestRes.text());
    }
    
    // Now test filing processing
    console.log('\n2. Testing filing processing...');
    
    const mockFiling = {
      ticker: 'MSTR',
      companyName: 'MicroStrategy Inc',
      formType: '8-K',
      filedAt: '2024-11-18T16:30:00',
      // Using a simple test URL that should work
      linkToTxt: 'https://www.sec.gov/Archives/edgar/data/1050446/000119312524262254/d897196d8k.txt',
      linkToFilingDetails: 'https://www.sec.gov/Archives/edgar/data/1050446/000119312524262254/d897196d8k-index.htm'
    };
    
    const config = {
      formTypes: ['8-K'],
      confidence: 65,
      aiModel: 'gpt-4o-mini',
      aiTemperature: 0.1,
      aiPrompt: `Analyze this filing. Response must be JSON. If it mentions Bitcoin, set isAlertWorthy to true. Example: {"isAlertWorthy": true, "confidenceScore": 95, "analysis": "Bitcoin purchase"}`
    };
    
    const processRes = await fetch('http://localhost:3000/api/sec/process-filing', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ filing: mockFiling, config })
    });
    
    console.log('Process filing response status:', processRes.status);
    if (processRes.ok) {
      const result = await processRes.json();
      console.log('Process result:', result);
    } else {
      console.error('Process failed:', await processRes.text());
    }
    
    console.log('\n3. Running MSTR ticker test...');
    
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
    
    if (tickerRes.ok) {
      const tickerResult = await tickerRes.json();
      console.log('Ticker test result:', tickerResult);
    } else {
      console.error('Ticker test failed:', await tickerRes.text());
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('\nIf you see status 200 responses above but no AI analysis in the logs,');
    console.log('check that your OPENAI_API_KEY in .env.local is valid.');
    console.log('\nThe server console should show:');
    console.log('- [Process Filing] logs');
    console.log('- [AI Analysis] logs');
    console.log('- === OPENAI REQUEST ===');
    console.log('- === OPENAI RESPONSE ===');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

runTest();