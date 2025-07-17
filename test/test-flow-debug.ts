#!/usr/bin/env node

/**
 * Debug the exact flow of ticker test
 */

async function debugFlow() {
  console.log('=== TICKER TEST FLOW DEBUG ===\n');
  
  try {
    // Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'navhunter123' })
    });
    
    const cookie = loginRes.headers.get('set-cookie')!;
    console.log('✅ Logged in\n');
    
    // Test with explicit config including AI prompt
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
    
    console.log('📋 Config:', {
      formTypes: config.formTypes,
      confidence: config.confidence,
      aiModel: config.aiModel,
      hasPrompt: !!config.aiPrompt,
      promptLength: config.aiPrompt.length
    });
    
    console.log('\n🚀 Starting ticker test for MSTR...\n');
    
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
    
    const result = await tickerRes.json();
    console.log('📊 Ticker test result:', result);
    
    console.log('\n⏳ Waiting 20 seconds for processing...\n');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    console.log('✅ Test complete\n');
    console.log('Check:');
    console.log('1. Server console for [Process Filing] and [AI Analysis] logs');
    console.log('2. Browser console for event logs');
    console.log('3. Left terminal in UI for filing logs');
    console.log('4. Right terminal in UI for AI analysis logs');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

debugFlow();