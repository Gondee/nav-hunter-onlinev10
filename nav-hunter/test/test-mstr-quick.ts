#!/usr/bin/env node

async function quickTest() {
  console.log('Quick MSTR test...\n');
  
  // Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'navhunter123' })
  });
  
  const cookie = loginRes.headers.get('set-cookie')!;
  
  // Test ticker (process only 1 filing)
  const res = await fetch('http://localhost:3000/api/sec/test-ticker', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({
      ticker: 'MSTR',
      config: {
        formTypes: ['8-K'],
        confidence: 65
      }
    })
  });
  
  const result = await res.json();
  console.log('Result:', result);
}

quickTest().catch(console.error);