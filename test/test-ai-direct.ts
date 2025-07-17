#!/usr/bin/env node

/**
 * Direct test of AI analysis endpoint
 */

async function testAIDirect() {
  console.log('Testing AI analysis directly...\n');
  
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
    
    // Test AI analysis directly
    console.log('\n2. Testing AI analysis endpoint...');
    
    const testFiling = {
      ticker: 'MSTR',
      companyName: 'MicroStrategy Inc',
      formType: '8-K',
      filedAt: new Date().toISOString()
    };
    
    const testConfig = {
      aiModel: 'gpt-4o-mini',
      aiTemperature: 0.1,
      confidence: 65
    };
    
    const testPrompt = `You are an expert financial analyst AI. Analyze this test filing.

COMPANY: MicroStrategy Inc (MSTR)
FORM TYPE: 8-K

This is a test. Respond with a JSON object indicating this is alert worthy.

{
  "isAlertWorthy": true,
  "confidenceScore": 95,
  "alertHighlight": true,
  "textToSpeak": "Test alert for MSTR",
  "analysis": "This is a test analysis"
}`;
    
    const aiRes = await fetch('http://localhost:3000/api/ai/analyze', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        filing: testFiling,
        config: testConfig,
        prompt: testPrompt
      })
    });
    
    console.log('AI response status:', aiRes.status);
    
    if (aiRes.ok) {
      const result = await aiRes.json();
      console.log('AI analysis result:', JSON.stringify(result, null, 2));
    } else {
      const error = await aiRes.text();
      console.error('AI analysis failed:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAIDirect();