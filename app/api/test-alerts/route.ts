import { NextResponse } from 'next/server';
import { broadcastLog, broadcastNewAlert, broadcastStats } from '@/lib/realtime/server';

export const runtime = 'nodejs';

// Sample test filings
const testFilings = [
  {
    id: 'test-1',
    ticker: 'AAPL',
    company: 'Apple Inc.',
    formType: '8-K',
    filedAt: new Date().toISOString(),
    confidenceScore: 85,
    isGoldAlert: true,
    analysis: {
      summary: 'Significant product announcement - new AI integration across product line',
      keyPoints: [
        'Major AI partnership announced',
        'Expected to impact Q2 revenue positively',
        'New product category entering beta'
      ],
      recommendation: 'Monitor closely for market reaction'
    },
    linkToFiling: 'https://www.sec.gov/example/aapl-8k',
    processingDelay: 2.3
  },
  {
    id: 'test-2',
    ticker: 'TSLA',
    company: 'Tesla, Inc.',
    formType: '8-K',
    filedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    confidenceScore: 72,
    isGoldAlert: false,
    analysis: {
      summary: 'Routine quarterly production numbers released',
      keyPoints: [
        'Q1 production met expectations',
        'Minor supply chain improvements noted'
      ]
    },
    linkToFiling: 'https://www.sec.gov/example/tsla-8k',
    processingDelay: 1.8
  },
  {
    id: 'test-3',
    ticker: 'MSFT',
    company: 'Microsoft Corporation',
    formType: '10-Q',
    filedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    confidenceScore: 91,
    isGoldAlert: true,
    analysis: {
      summary: 'Exceptional quarterly results with significant beat on cloud revenue',
      keyPoints: [
        'Azure revenue up 45% YoY',
        'Operating margins expanded by 300bps',
        'Raised full-year guidance',
        'Share buyback program increased by $60B'
      ],
      recommendation: 'Strong positive signal for tech sector'
    },
    linkToFiling: 'https://www.sec.gov/example/msft-10q',
    processingDelay: 3.1
  },
  {
    id: 'test-4',
    ticker: 'JPM',
    company: 'JPMorgan Chase & Co.',
    formType: '8-K',
    filedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    confidenceScore: 68,
    isGoldAlert: false,
    analysis: {
      summary: 'Regular dividend declaration and board meeting results',
      keyPoints: [
        'Quarterly dividend maintained at $1.00/share',
        'No change in strategic direction'
      ]
    },
    linkToFiling: 'https://www.sec.gov/example/jpm-8k',
    processingDelay: 1.5
  },
  {
    id: 'test-5',
    ticker: 'AMZN',
    company: 'Amazon.com, Inc.',
    formType: '8-K',
    filedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    confidenceScore: 88,
    isGoldAlert: true,
    analysis: {
      summary: 'Major acquisition announced - entering healthcare sector',
      keyPoints: [
        '$3.9B acquisition of healthcare startup',
        'Expansion into prescription drug delivery',
        'Expected to close in Q3',
        'Regulatory approval pending'
      ],
      recommendation: 'Significant strategic shift - monitor regulatory response'
    },
    linkToFiling: 'https://www.sec.gov/example/amzn-8k',
    processingDelay: 2.7
  }
];

export async function POST() {
  try {
    broadcastLog('🧪 Starting test alert simulation...', 'info');
    
    // Send test alerts with delays to simulate real-time flow
    for (let i = 0; i < testFilings.length; i++) {
      const filing = testFilings[i];
      
      // Simulate processing
      broadcastLog(`📄 Test filing ${i + 1}/5: ${filing.company} (${filing.ticker}) - ${filing.formType}`, 'info');
      
      // Update stats
      broadcastStats({ 
        processed: i + 1,
        alerts: testFilings.slice(0, i + 1).filter(f => f.confidenceScore >= 65).length
      });
      
      // Broadcast the alert (type is added by broadcastNewAlert)
      broadcastNewAlert(filing);
      
      // Wait 1 second between alerts to simulate real-time flow
      if (i < testFilings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    broadcastLog('✅ Test simulation complete - sent 5 test alerts', 'success');
    
    return NextResponse.json({ 
      success: true,
      message: 'Test alerts sent successfully',
      count: testFilings.length
    });
  } catch (error) {
    console.error('Error sending test alerts:', error);
    broadcastLog(`❌ Test failed: ${error}`, 'error');
    return NextResponse.json(
      { success: false, error: 'Failed to send test alerts' },
      { status: 500 }
    );
  }
}