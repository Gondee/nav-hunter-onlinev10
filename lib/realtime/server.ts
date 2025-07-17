import type { RealtimeEvent, RealtimeEventType } from '@/types/realtime';

// Global store for SSE connections with user tracking
const sseConnections = new Set<ReadableStreamDefaultController>();
const userConnections = new Map<string, ReadableStreamDefaultController>();

// Broadcast to all SSE connections
export function broadcastSSE(event: RealtimeEvent) {
  const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\nid: ${event.id || Date.now()}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  // Clean up closed connections
  const closedConnections = new Set<ReadableStreamDefaultController>();
  
  sseConnections.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      // Connection is closed
      closedConnections.add(controller);
    }
  });

  // Remove closed connections
  closedConnections.forEach((controller) => {
    sseConnections.delete(controller);
  });
}

// Create SSE stream
export function createSSEStream(
  onConnect?: () => void,
  onDisconnect?: () => void
): ReadableStream {
  let controller: ReadableStreamDefaultController;
  let heartbeatInterval: NodeJS.Timeout;

  return new ReadableStream({
    start(c) {
      controller = c;
      sseConnections.add(controller);

      // Send initial connection event
      const connectEvent = new TextEncoder().encode('event: connected\ndata: {}\n\n');
      controller.enqueue(connectEvent);

      // Setup heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = new TextEncoder().encode(':heartbeat\n\n');
          controller.enqueue(heartbeat);
        } catch (error) {
          // Connection closed
          clearInterval(heartbeatInterval);
        }
      }, 30000); // 30 seconds

      if (onConnect) {
        onConnect();
      }
    },
    cancel() {
      // Clean up when client disconnects
      sseConnections.delete(controller);
      clearInterval(heartbeatInterval);
      
      if (onDisconnect) {
        onDisconnect();
      }
    },
  });
}

// Broadcast event to all connected clients
export function broadcast(type: RealtimeEventType, data: any) {
  console.log(`[Realtime] Broadcasting event: ${type}`, 'to', sseConnections.size, 'clients');
  
  const event: RealtimeEvent = {
    type,
    data,
    timestamp: Date.now(),
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  // Broadcast to SSE connections
  broadcastSSE(event);

  // If Pusher is configured, broadcast there too
  if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET) {
    broadcastPusher(event).catch(console.error);
  }
}

// Broadcast via Pusher (fallback)
async function broadcastPusher(event: RealtimeEvent) {
  try {
    const Pusher = (await import('pusher')).default;
    
    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER || 'us2',
      useTLS: true,
    });

    await pusher.trigger('realtime-events', event.type, event.data);
  } catch (error) {
    console.error('Failed to broadcast via Pusher:', error);
  }
}

// Get connected clients count
export function getConnectedClientsCount(): number {
  return sseConnections.size;
}

// Utility functions for specific event types
export const broadcastLog = (message: string, level?: string) => {
  broadcast('log_message', { message, level, timestamp: new Date().toISOString() });
};

export const broadcastAILog = (message: string, level?: string, details?: any, model?: string, tokens?: number) => {
  console.log('[Realtime] Broadcasting AI log:', message);
  broadcast('ai_log_message', { 
    message, 
    level: level || 'info',
    details,
    model, 
    tokens, 
    timestamp: new Date().toISOString() 
  });
};

export const broadcastNewAlert = (alert: any) => {
  broadcast('new_alert', alert);
};

export const broadcastTTS = (text: string, voice?: string, speed?: number) => {
  broadcast('play_tts_audio', { text, voice, speed });
};

export const broadcastStats = (stats: any) => {
  broadcast('update_stats', stats);
};

export const broadcastMonitoringStatus = (status: any) => {
  broadcast('monitoring_status', status);
};

export const broadcastWSStatus = (status: any) => {
  broadcast('ws_status', status);
};

export const broadcastWSFlash = (message: string, type: 'success' | 'warning' | 'error', duration?: number) => {
  broadcast('ws_status_flash', { message, type, duration });
};

export const broadcastTestFinished = (symbol: string, success: boolean, results?: any, error?: string) => {
  broadcast('test_ticker_finished', { symbol, success, results, error });
};

export const broadcastReplayFinished = (success: boolean, totalProcessed?: number, errors?: string[], duration?: number) => {
  broadcast('replay_finished', { success, totalProcessed, errors, duration });
};

export const broadcastServerShutdown = (reason?: string, gracePeriod?: number) => {
  broadcast('server_shutting_down', { reason, gracePeriod });
};

// Clean up all connections (for server shutdown)
export function closeAllConnections() {
  sseConnections.forEach((controller) => {
    try {
      controller.close();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });
  sseConnections.clear();
}