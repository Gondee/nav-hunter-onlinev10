#!/usr/bin/env node

/**
 * Test SEC API directly to see filing structure
 */

async function testSecApi() {
  console.log('Testing SEC API directly...\n');
  
  try {
    // Import sec-api
    const secApi = (await import('sec-api')).default;
    
    // Set API key
    const apiKey = '5a3800c6cf1b06af7c6f00f86dc7b8b4b008c41e3bb9e0f0db65b3f067c0a3f1';
    secApi.setApiKey(apiKey);
    
    // Query for MSTR 8-K filings
    const query = {
      query: { 
        query_string: { 
          query: 'ticker:MSTR AND formType:"8-K"'
        } 
      },
      from: "0",
      size: "1",
      sort: [{ filedAt: { order: "desc" } }]
    };
    
    console.log('Fetching latest MSTR 8-K filing...');
    const result = await secApi.queryApi.getFilings(query);
    
    if (result.filings && result.filings.length > 0) {
      const filing = result.filings[0];
      console.log('\nFiling structure:');
      console.log(JSON.stringify(filing, null, 2));
      
      console.log('\n\nKey URLs:');
      console.log('linkToTxt:', filing.linkToTxt || 'NOT PRESENT');
      console.log('linkToText:', filing.linkToText || 'NOT PRESENT');
      console.log('linkToHtml:', filing.linkToHtml || 'NOT PRESENT');
      console.log('linkToFilingDetails:', filing.linkToFilingDetails || 'NOT PRESENT');
      console.log('documentFormatFiles:', filing.documentFormatFiles || 'NOT PRESENT');
    } else {
      console.log('No filings found');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSecApi();