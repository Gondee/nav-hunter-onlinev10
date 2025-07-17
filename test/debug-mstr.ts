#!/usr/bin/env node

/**
 * Debug MSTR ticker test to see what's happening
 */

async function login(): Promise<string> {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'navhunter123' })
  });
  
  if (!response.ok) {
    throw new Error('Login failed');
  }
  
  const cookies = response.headers.get('set-cookie');
  if (!cookies) {
    throw new Error('No auth cookie received');
  }
  
  return cookies;
}

async function debugMSTR() {
  console.log('🔍 Debugging MSTR Ticker Test\n');
  
  // Login
  const authCookie = await login();
  console.log('✅ Logged in\n');
  
  // First, let's get a real MSTR filing
  console.log('1. Fetching recent MSTR filings from SEC API...');
  const secApi = await import('sec-api');
  secApi.setApiKey(process.env.SEC_API_KEY!);
  
  const query = {
    query: { 
      query_string: { 
        query: 'ticker:MSTR AND formType:"8-K" AND filedAt:[2024-01-01 TO *]'
      } 
    },
    from: "0",
    size: "1",
    sort: [{ filedAt: { order: "desc" } }]
  };
  
  const result = await secApi.queryApi.getFilings(query);
  
  if (!result.filings || result.filings.length === 0) {
    console.log('❌ No MSTR filings found');
    return;
  }
  
  const filing = result.filings[0];
  console.log('\n📄 Found filing:');
  console.log('   Ticker:', filing.ticker);
  console.log('   Form:', filing.formType);
  console.log('   Date:', filing.filedAt);
  console.log('   Company:', filing.companyName);
  console.log('   linkToTxt:', filing.linkToTxt || 'N/A');
  console.log('   linkToHtml:', filing.linkToHtml || 'N/A');
  console.log('   linkToFilingDetails:', filing.linkToFilingDetails || 'N/A');
  
  // Check if we can fetch content
  if (filing.linkToTxt) {
    console.log('\n2. Fetching filing content...');
    try {
      const response = await fetch(filing.linkToTxt);
      if (response.ok) {
        const text = await response.text();
        console.log('   Content length:', text.length, 'characters');
        
        // Check for crypto keywords
        const cryptoKeywords = ['bitcoin', 'btc', 'cryptocurrency', 'digital asset'];
        const foundKeywords = cryptoKeywords.filter(kw => 
          text.toLowerCase().includes(kw)
        );
        console.log('   Crypto keywords found:', foundKeywords.length > 0 ? foundKeywords.join(', ') : 'None');
      } else {
        console.log('   ❌ Failed to fetch content:', response.status);
      }
    } catch (error) {
      console.log('   ❌ Error fetching content:', error);
    }
  }
  
  // Now test the process-filing endpoint directly
  console.log('\n3. Testing process-filing endpoint...');
  const config = {
    formTypes: ['8-K'],
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
2.  **confidenceScore** (integer, 0-100): Your confidence level.
3.  **alertHighlight** (boolean): Set to true if this is indeed an initial pivot to a new strategy involving crypto assets as treasury assets.
4.  **textToSpeak** (string): A concise summary for audio notification.

**Example of a crypto alert:**
{
  "isAlertWorthy": true,
  "confidenceScore": 98,
  "alertHighlight": true,
  "textToSpeak": "Alert on ticker M S T R. Bitcoin purchase detected."
}`
  };
  
  const processResponse = await fetch('http://localhost:3000/api/sec/process-filing', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({ filing, config })
  });
  
  if (processResponse.ok) {
    const result = await processResponse.json();
    console.log('   Process result:', result);
  } else {
    console.log('   ❌ Process failed:', await processResponse.text());
  }
  
  // Test AI directly with sample MSTR content
  console.log('\n4. Testing AI analysis with known MSTR Bitcoin content...');
  const testPrompt = config.aiPrompt
    .replace('{company}', 'MicroStrategy Inc.')
    .replace('{ticker}', 'MSTR')
    .replace('{formType}', '8-K') + `
    
FILING CONTENT TO ANALYZE:
Item 8.01 Other Events.

On December 11, 2024, MicroStrategy Incorporated announced that it has purchased an additional 21,550 bitcoins for approximately $2.1 billion in cash at an average price of approximately $98,783 per bitcoin, inclusive of fees and expenses. As of December 11, 2024, MicroStrategy holds an aggregate of approximately 423,650 bitcoins, which were acquired at an aggregate purchase price of approximately $25.6 billion.`;

  const aiResponse = await fetch('http://localhost:3000/api/ai/analyze', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({
      filing: {
        ticker: 'MSTR',
        companyName: 'MicroStrategy Inc.',
        formType: '8-K'
      },
      config,
      prompt: testPrompt
    })
  });
  
  if (aiResponse.ok) {
    const analysis = await aiResponse.json();
    console.log('   AI Analysis:', JSON.stringify(analysis, null, 2));
    
    if (analysis.isAlertWorthy) {
      console.log('   ✅ Alert should be triggered!');
    } else {
      console.log('   ❌ AI did not mark as alert worthy');
    }
  } else {
    console.log('   ❌ AI analysis failed:', await aiResponse.text());
  }
}

// Run debug
debugMSTR().catch(console.error);