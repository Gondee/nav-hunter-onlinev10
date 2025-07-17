import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[Process Filing Test] GET request received');
  
  return Response.json({
    message: 'Process filing endpoint is accessible',
    timestamp: new Date().toISOString()
  });
}