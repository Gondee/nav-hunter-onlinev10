import { NextRequest } from 'next/server';
import { createSSEStream, getConnectedClientsCount } from '@/lib/realtime/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create SSE stream
  const stream = createSSEStream(
    // onConnect
    () => {
      console.log(`Client connected. Total clients: ${getConnectedClientsCount()}`);
    },
    // onDisconnect
    () => {
      console.log(`Client disconnected. Total clients: ${getConnectedClientsCount()}`);
    }
  );

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}