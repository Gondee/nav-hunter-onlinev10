#!/usr/bin/env node

/**
 * Comprehensive debug test
 */

async function fullDebugTest() {
  const PORT = process.env.PORT || '3000';
  const BASE_URL = `http://localhost:${PORT}`;
  
  console.log(`\n🔍 FULL DEBUG TEST - Using ${BASE_URL}\n`);
  
  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'navhunter123' })
    });
    
    if (!loginRes.ok) {
      console.error('Login failed:', loginRes.status);
      return;
    }
    
    const cookie = loginRes.headers.get('set-cookie')!;
    console.log('✅ Logged in\n');
    
    // 2. Test OpenAI connection
    console.log('2. Testing OpenAI connection...');
    const openaiRes = await fetch(`${BASE_URL}/api/test-openai`, {
      headers: { 'Cookie': cookie }
    });
    
    const openaiResult = await openaiRes.json();
    console.log('OpenAI test result:', JSON.stringify(openaiResult, null, 2));
    
    if (!openaiResult.success) {
      console.error('\n❌ OpenAI API is not working!');
      console.error('This explains why you see no AI analysis.');
      console.error('Please check your OPENAI_API_KEY in .env.local');
      return;
    }
    
    console.log('✅ OpenAI is working\n');
    
    // 3. Test filing processing with a simple mock
    console.log('3. Testing filing processing...');
    
    const mockFiling = {
      ticker: 'TEST',
      companyName: 'Test Company',
      formType: '8-K',
      filedAt: new Date().toISOString(),
      // Use a simple mock URL that returns text
      linkToTxt: 'https://example.com/test.txt',
      linkToFilingDetails: 'https://example.com/test.html'
    };
    
    const config = {
      formTypes: ['8-K'],
      confidence: 65,
      aiModel: 'gpt-4o-mini',
      aiTemperature: 0.1,
      aiPrompt: 'Test prompt. Company: {company}. Respond with JSON: {"isAlertWorthy": true, "confidenceScore": 95}'
    };
    
    const processRes = await fetch(`${BASE_URL}/api/sec/process-filing`, {
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
      console.error('Process error:', error);
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('\nCheck your SERVER CONSOLE (where you ran npm run dev) for:');
    console.log('- [Process Filing] logs');
    console.log('- [AI Analysis] logs'); 
    console.log('- === OPENAI REQUEST ===');
    console.log('- === OPENAI RESPONSE ===');
    console.log('\nIf you see the OpenAI test working above but no AI logs in server console,');
    console.log('it means the filing processing is not reaching the AI analysis step.');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Check which port the server is on
fetch('http://localhost:3000/api/auth/login', { method: 'POST' })
  .then(() => {
    console.log('Server found on port 3000');
    process.env.PORT = '3000';
    fullDebugTest();
  })
  .catch(() => {
    console.log('Server not on 3000, trying 3001...');
    process.env.PORT = '3001';
    fullDebugTest();
  });