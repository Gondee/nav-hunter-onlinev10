import { NextRequest } from 'next/server';
import { eventBus } from '@/lib/services/event-bus';

export async function POST(request: NextRequest) {
  try {
    const message = await request.json();
    eventBus.broadcast(message);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Failed to broadcast message' }, { status: 500 });
  }
}