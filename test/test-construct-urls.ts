#!/usr/bin/env node

/**
 * Test constructing filing URLs from SEC data
 */

async function testConstructUrls() {
  console.log('Testing URL construction...\n');
  
  try {
    // Import sec-api
    const secApi = (await import('sec-api')).default;
    
    // Set API key
    const apiKey = process.env.SEC_API_KEY || '3161badc9a49d43da4c9db92d17e1213026a0f70df0fdabae4eaf7812f5188b3';
    secApi.setApiKey(apiKey);
    
    // Query for one MSTR filing
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
    
    console.log('Fetching MSTR filing...');
    const result = await secApi.queryApi.getFilings(query);
    
    if (result.filings && result.filings.length > 0) {
      const filing = result.filings[0];
      console.log('\n=== FILING DATA ===');
      console.log(JSON.stringify(filing, null, 2));
      
      // Check if we have accessionNo and can construct URLs
      if (filing.accessionNo) {
        console.log('\n=== CONSTRUCTED URLs ===');
        const accessionNoFormatted = filing.accessionNo.replace(/-/g, '');
        const cik = filing.cik || filing.CIK;
        
        if (cik) {
          const baseUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoFormatted}`;
          
          console.log('Base URL:', baseUrl);
          console.log('Possible TXT URL:', `${baseUrl}/${filing.accessionNo}.txt`);
          console.log('Possible HTML URL:', `${baseUrl}/${filing.accessionNo}-index.htm`);
          console.log('Possible Filing Details:', `${baseUrl}/${filing.accessionNo}-index.htm`);
        }
      }
    } else {
      console.log('No filings found');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConstructUrls();