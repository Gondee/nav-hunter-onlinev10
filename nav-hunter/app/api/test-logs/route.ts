import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('=== TEST LOG 1: console.log ===');
  console.error('=== TEST LOG 2: console.error ===');
  console.warn('=== TEST LOG 3: console.warn ===');
  
  // Also try process.stdout.write
  process.stdout.write('=== TEST LOG 4: process.stdout ===\n');
  process.stderr.write('=== TEST LOG 5: process.stderr ===\n');
  
  return Response.json({ 
    message: 'Check server console for 5 different log types',
    timestamp: new Date().toISOString()
  });
}