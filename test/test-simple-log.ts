#!/usr/bin/env node

/**
 * Simple test to trigger logs
 */

console.log('\n🚨 IMPORTANT: Make sure you\'re watching the RIGHT server console!\n');
console.log('The server console is where you ran "npm run dev"');
console.log('NOT this terminal where you\'re running the test\n');

async function simpleTest() {
  // Find which port the server is on
  let PORT = '3000';
  
  try {
    await fetch('http://localhost:3000/api/auth/login', { method: 'HEAD' });
    PORT = '3000';
  } catch {
    try {
      await fetch('http://localhost:3001/api/auth/login', { method: 'HEAD' });
      PORT = '3001';
    } catch {
      console.error('❌ No server found on ports 3000 or 3001');
      console.error('Please start the server with: npm run dev');
      return;
    }
  }
  
  console.log(`✅ Server found on port ${PORT}\n`);
  
  // Login
  const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'navhunter123' })
  });
  
  const cookie = loginRes.headers.get('set-cookie')!;
  
  // Call process-filing
  console.log('📤 Calling /api/sec/process-filing...\n');
  
  const res = await fetch(`http://localhost:${PORT}/api/sec/process-filing`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({
      filing: {
        ticker: 'LOGTEST',
        companyName: 'Log Test Company',
        formType: '8-K',
        linkToTxt: 'https://example.com/test.txt'
      },
      config: {
        aiPrompt: 'This is a test prompt for {company}'
      }
    })
  });
  
  console.log('Response:', res.status);
  
  console.log('\n🔍 NOW CHECK YOUR SERVER CONSOLE!');
  console.log('You should see:');
  console.log('  [Process Filing] Endpoint called');
  console.log('  [Process Filing] Reading request body...');
  console.log('  [Process Filing] Body received: { hasFiling: true, hasConfig: true, ticker: \'LOGTEST\' }');
  console.log('\nIf you don\'t see these, you\'re looking at the wrong console!');
}

simpleTest().catch(console.error);