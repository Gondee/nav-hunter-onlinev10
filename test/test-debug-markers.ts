#!/usr/bin/env node

/**
 * Test with debug markers to trace execution
 */

async function testWithMarkers() {
  console.log('\n🔍 DEBUG TEST - Watch your SERVER CONSOLE for these markers:\n');
  console.log('==================================================');
  console.log('MARKER_START_TEST_' + Date.now());
  console.log('==================================================\n');
  
  try {
    // Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'navhunter123' })
    });
    
    const cookie = loginRes.headers.get('set-cookie')!;
    console.log('✅ Logged in\n');
    
    // Add a debug endpoint to test logging
    console.log('1. Testing debug endpoint...');
    await fetch('http://localhost:3000/api/debug/events', {
      headers: { 'Cookie': cookie }
    });
    
    console.log('2. Processing a test filing...\n');
    
    // Process a simple filing
    const testFiling = {
      ticker: 'DEBUGTEST',
      companyName: 'Debug Test Company',
      formType: '8-K',
      filedAt: new Date().toISOString(),
      linkToTxt: 'https://