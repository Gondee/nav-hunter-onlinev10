#!/usr/bin/env node

/**
 * Basic test to verify endpoints are working
 */

async function testEndpoints() {
  console.log('\n=== ENDPOINT TEST ===\n');
  
  try {
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
    console.log('✅ Logged in\n');
    
    // Test 1: Process filing with minimal data
    console.log('1. Testing process-filing with minimal data...');
    
    const minimalRes = await fetch('http://localhost:3000/api/sec/process-filing', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        filing: {
          ticker: 'TEST',
          companyName: 'Test Co',
          formType: '8-K'
        },
        config: {
          aiPrompt: 'Test prompt'
        }
      })
    });
    
    console.log('Response status:', minimalRes.status);
    console.log('Response headers:', Object.fromEntries(minimalRes.headers.entries()));
    
    const responseText = await minimalRes.text();
    console.log('Response text:', responseText);
    
    console.log('\n=== CHECK SERVER CONSOLE ===');
    console.log('You should see AT LEAST:');
    console.log('- [Process Filing] Endpoint called');
    console.log('- [Process Filing] Reading request body...');
    console.log('- [Process Filing] Body received:');
    console.log('\nIf you don\'t see these, the endpoint isn\'t being reached at all.');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testEndpoints();