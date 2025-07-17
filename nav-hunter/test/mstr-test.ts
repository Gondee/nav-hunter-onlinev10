#!/usr/bin/env node

/**
 * Test case for MSTR ticker to verify AI analysis and alert generation
 */

async function login(): Promise<string> {
  console.log('Logging in...');
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'navhunter123' })
  });
  
  if (!response.ok) {
    throw new Error('Login failed');
  }
  
  // Extract auth token from cookies
  const cookies = response.headers.get('set-cookie');
  if (!cookies) {
    throw new Error('No auth cookie received');
  }
  
  return cookies;
}

async function testMSTR() {
  console.log('Starting MSTR test case...\n');
  
  // Login first
  let authCookie: string;
  try {
    authCookie = await login();
    console.log('Login successful\n');
  } catch (error) {
    console.error('Login failed:', error);
    return;
  }
  
  // Test configuration
  const config = {
    formTypes: ['8-K', '10-Q', '10-K'],
    confidence: 65,
    aiModel: 'gpt-4o-mini',
    aiTemperature: 0.1,
    aiPrompt: `You are an expert financial analyst AI. Your task is to analyze SEC filings for specific, user-defined events.

COMPANY: {company} ({ticker})
FORM TYPE: {formType}

First, analyze the filing to determine if it contains any relevant information according to the user's criteria. Your response MUST be a clean JSON object without any markdown.

**Primary Decision:**
- **isAlertWorthy** (boolean): This is the most important field.
    - Set to **true** ONLY if the filing contains a significant, actionable event that matches the user's criteria.
    - Set to **false** if the filing is routine, irrelevant, or does not contain any event of interest. **If this is false, no alert will be generated.**

**If and ONLY If isAlertWorthy is true, provide the following:**
1.  **isAlertWorthy** (boolean): Set to true ONLY if the filing contains information about crypto currencies or digital assets being added to the company's treasury, or if it is an initial pivot to a new strategy involving crypto assets. This should be a significant event that warrants immediate attention.
   - For example, if a company announces it is adopting Bitcoin as its primary treasury reserve asset, this should be marked as worthy of an alert.
   - If the filing is a routine update without significant changes to crypto holdings or strategy, set this to false.
2.  **confidenceScore** (integer, 0-100): Your confidence level in your understanding of setting the isAlertWorthy field. This should reflect how certain you are that the filing meets the criteria for an alert.
   - For example, if you are very confident that the filing is significant, set this to 90 or above. If you are unsure, set it lower.
   - If you set isAlertWorthy to true, confidenceScore should be at least 80.
3.  **alertHighlight** (boolean): Set to true if this is indeed an initial pivot to a new strategy involving crypto assets as treasury assets for the company, such as Bitcoin or Ethereum. This should be used to highlight the most significant changes in strategy.
   - For example, if a company is pivoting to focus on Bitcoin as its primary treasury asset, set this to true. Meaning the first time they are doing this.
   - If the filing is a routine update or does not represent a significant change, set this to false. If the update does not explictly mention a pivot to the purchase of crypto assets on the balance sheet, set this to false.
4.  **textToSpeak** (string): A concise, spoken-word summary of the alert for audio notification with ticket and relevant quote. Example: "Alert for M S T R. Initial strategy pivot. Quote: MicroStrategy has purchased an additional 12,000 bitcoins."
5. **isChinese** (boolean): Set to true if the filing is from a Chinese company, false otherwise. This is important for filtering out filings from companies that may not be relevant to the user's focus on US-based crypto treasury pivots.
6. **investors** (string): let me know the few key investors involved in this event
7. **RaiseOrAnnouncment** (String): If this is a actual raise or announcement (meaning the money is confirmed raised, not an announcment to raise), Then Say yes and give proof, otherwise Say No. This is important to distinguish between routine updates and significant events.


**A complete example response for an initial pivot:**
{
  "isAlertWorthy": true,
  "confidenceScore": 98,
  "alertHighlight": true,
  "isChinese": false,
  "investors": "Michael Saylor, Pantera Capital",
  "RaiseOrAnnouncment": "Yes, this is actual funds raised based on Quote of 1 sentence"
  "textToSpeak": "Alert on ticker M S T R. Form 8-K. Initial strategy pivot. Quote: MicroStrategy adopts Bitcoin as its primary treasury reserve asset. Let me know if chinese",
  "Event Type": "Crypto Treasury Pivot",
  "Asset": "Bitcoin (BTC)",
  "Key Quote": "The board of directors has approved a new treasury reserve policy that makes bitcoin the company's primary treasury reserve asset."
}

**Example of an Irrelevant Filing (No Alert):**
{
  "isAlertWorthy": false
}`,
    secApiKey: process.env.SEC_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || ''
  };
  
  // Sample MSTR filing (you can replace with actual data)
  const testFiling = {
    id: 'test-mstr-001',
    ticker: 'MSTR',
    companyName: 'MicroStrategy Inc.',
    formType: '8-K',
    filedAt: new Date().toISOString(),
    reportDate: new Date().toISOString(),
    value: 2500000000, // $2.5B
    linkToFilingDetails: 'https://www.sec.gov/Archives/edgar/data/1050446/example.html',
    linkToHtml: 'https://www.sec.gov/Archives/edgar/data/1050446/example.html',
    // Add more realistic filing data here
  };
  
  try {
    // Test 1: Direct AI Analysis
    console.log('Test 1: Testing AI Analysis directly...');
    const analysisResponse = await fetch('http://localhost:3000/api/ai/analyze', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        filing: testFiling,
        config
      })
    });
    
    const analysisResult = await analysisResponse.json();
    console.log('AI Analysis Result:', JSON.stringify(analysisResult, null, 2));
    
    if (!analysisResponse.ok) {
      console.error('AI Analysis failed:', analysisResult);
      return;
    }
    
    // Test 2: Process Filing (includes alert generation)
    console.log('\nTest 2: Testing full filing processing...');
    const processResponse = await fetch('http://localhost:3000/api/sec/process-filing', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        filing: testFiling,
        config
      })
    });
    
    const processResult = await processResponse.json();
    console.log('Process Result:', processResult);
    
    // Test 3: Test actual ticker through API
    console.log('\nTest 3: Testing actual MSTR ticker through API...');
    const tickerResponse = await fetch('http://localhost:3000/api/sec/test-ticker', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        ticker: 'MSTR',
        config
      })
    });
    
    const tickerResult = await tickerResponse.json();
    console.log('Ticker Test Result:', tickerResult);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Check if required environment variables are set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable not set');
  console.log('Please set: export OPENAI_API_KEY=your-key-here');
  process.exit(1);
}

if (!process.env.SEC_API_KEY) {
  console.error('Error: SEC_API_KEY environment variable not set');
  console.log('Please set: export SEC_API_KEY=your-key-here');
  process.exit(1);
}

// Run the test
testMSTR().then(() => {
  console.log('\nTest completed');
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});