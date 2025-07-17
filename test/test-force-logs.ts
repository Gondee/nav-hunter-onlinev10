#!/usr/bin/env node

/**
 * Force logs to appear
 */

async function forceLogsTest() {
  console.log('\n=== FORCE LOGS TEST ===\n');
  
  // Write directly to stderr to bypass any log filtering
  console.error('[TEST] This should definitely appear in server console');
  
  try {
    // Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'navhunter123' })
    });
    
    const cookie = loginRes.headers.get('set-cookie')!;
    
    // Create a filing that will definitely trigger all logs
    const testFiling = {
      ticker: 'FORCELOG',
      companyName: 'Force Log Test',
      formType: '8-K',
      filedAt: new Date().toISOString(),
      // Use a URL that will return something
      linkToTxt: 'https://httpbin.org/html',
      linkToFilingDetails: 'https://httpbin.org/html'
    };
    
    // Minimal config to ensure we get to AI analysis
    const config = {
      formTypes: ['8-K'],
      confidence: 65,
      aiModel: 'gpt-4o-mini',
      aiTemperature: 0.1,
      aiPrompt: 'Test {company}. Return JSON: {"isAlertWorthy": true, "confidenceScore": 95}'
    };
    
    console.log('Calling process-filing...\n');
    
    const res = await fetch('http://localhost:3000/api/sec/process-filing', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ filing: testFiling, config })
    });
    
    console.log('Response status:', res.status);
    const result = await res.text();
    console.log('Response:', result);
    
    console.log('\n=== DEBUGGING STEPS ===');
    console.log('1. Are you running Next.js in development mode? (npm run dev, not npm start)');
    console.log('2. Are you looking at the correct terminal?');
    console.log('3. Try adding console.error() instead of console.log() in the code');
    console.log('4. Check if your .env.local has any log suppression settings');
    console.log('\nIf you STILL don\'t see logs, the issue might be:');
    console.log('- Next.js is caching the old module');
    console.log('- The process-filing route is not the one being called');
    console.log('- There\'s an error very early in the process');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

forceLogsTest();