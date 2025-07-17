import type {
  RealtimeEvent,
  RealtimeEventType,
  RealtimeConnectionState,
  RealtimeConnectionStatus,
  RealtimeClientConfig,
} from '@/types/realtime';

export class RealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<RealtimeEventType, Set<(data: any) => void>> = new Map();
  private connectionState: RealtimeConnectionState = {
    status: 'disconnected',
    retryCount: 0,
  };
  private config: Required<RealtimeClientConfig>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pusherClient: any = null;
  private usePusher: boolean = false;
  private onConnectionStateChange?: (state: RealtimeConnectionState) => void;

  constructor(config: RealtimeClientConfig = {}) {
    this.config = {
      url: config.url || '/api/sec/stream',
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      enablePusherFallback: config.enablePusherFallback || false,
      pusherConfig: config.pusherConfig || {
        appKey: '',
        cluster: '',
        forceTLS: true,
      },
    };
  }

  connect() {
    this.updateConnectionState('connecting');
    
    try {
      // Try SSE first
      this.connectSSE();
    } catch (error) {
      console.error('Failed to connect via SSE:', error);
      
      // Fallback to Pusher if enabled
      if (this.config.enablePusherFallback && this.config.pusherConfig.appKey) {
        this.connectPusher();
      } else {
        this.updateConnectionState('error', error as Error);
        this.scheduleReconnect();
      }
    }
  }

  private connectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(this.config.url);

    this.eventSource.onopen = () => {
      console.log('SSE connection established');
      this.updateConnectionState('connected');
      this.connectionState.retryCount = 0;
      this.startHeartbeat();
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.updateConnectionState('error', new Error('SSE connection failed'));
      this.stopHeartbeat();
      
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.scheduleReconnect();
      }
    };

    // Handle specific event types
    const eventTypes: RealtimeEventType[] = [
      'log_message',
      'ai_log_message',
      'new_alert',
      'play_tts_audio',
      'update_stats',
      'monitoring_status',
      'ws_status',
      'ws_status_flash',
      'test_ticker_finished',
      'replay_finished',
      'server_shutting_down',
      'filing',
      'alert',
      'status',
      'error',
      'connected',
    ];

    eventTypes.forEach((eventType) => {
      this.eventSource!.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleEvent({
            type: eventType,
            data,
            timestamp: Date.now(),
            id: event.lastEventId,
          });
        } catch (error) {
          console.error(`Failed to parse ${eventType} event:`, error);
        }
      });
    });

    // Handle generic messages
    this.eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type) {
          this.handleEvent({
            type: message.type,
            data: message.data || message,
            timestamp: Date.now(),
            id: event.lastEventId,
          });
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }

  private async connectPusher() {
    if (!this.config.pusherConfig.appKey) {
      throw new Error('Pusher configuration missing');
    }

    try {
      // Dynamically import Pusher to avoid loading if not needed
      const Pusher = (await import('pusher-js')).default;
      
      this.pusherClient = new Pusher(this.config.pusherConfig.appKey, {
        cluster: this.config.pusherConfig.cluster,
        forceTLS: this.config.pusherConfig.forceTLS,
      });

      const channel = this.pusherClient.subscribe('realtime-events');

      this.pusherClient.connection.bind('connected', () => {
        console.log('Pusher connection established');
        this.usePusher = true;
        this.updateConnectionState('connected');
        this.connectionState.retryCount = 0;
      });

      this.pusherClient.connection.bind('error', (error: any) => {
        console.error('Pusher connection error:', error);
        this.updateConnectionState('error', new Error(error.message || 'Pusher connection failed'));
      });

      // Bind to all event types
      const eventTypes: RealtimeEventType[] = [
        'log_message',
        'ai_log_message',
        'new_alert',
        'play_tts_audio',
        'update_stats',
        'monitoring_status',
        'ws_status',
        'ws_status_flash',
        'test_ticker_finished',
        'replay_finished',
        'server_shutting_down',
      ];

      eventTypes.forEach((eventType) => {
        channel.bind(eventType, (data: any) => {
          this.handleEvent({
            type: eventType,
            data,
            timestamp: Date.now(),
          });
        });
      });
    } catch (error) {
      console.error('Failed to connect via Pusher:', error);
      this.updateConnectionState('error', error as Error);
      this.scheduleReconnect();
    }
  }

  private handleEvent(event: RealtimeEvent) {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event.data);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }

    // Handle special events
    if (event.type === 'server_shutting_down') {
      this.handleServerShutdown(event.data);
    }
  }

  private handleServerShutdown(data: any) {
    console.warn('Server shutting down:', data);
    this.disconnect();
    this.updateConnectionState('disconnected');
  }

  subscribe(eventType: RealtimeEventType, handler: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(eventType, handler);
    };
  }

  unsubscribe(eventType: RealtimeEventType, handler: (data: any) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  private updateConnectionState(status: RealtimeConnectionStatus, error?: Error) {
    this.connectionState = {
      ...this.connectionState,
      status,
      error,
      lastConnected: status === 'connected' ? new Date() : this.connectionState.lastConnected,
    };

    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(this.connectionState);
    }
  }

  private scheduleReconnect() {
    if (this.connectionState.retryCount >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateConnectionState('error', new Error('Max reconnection attempts reached'));
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.connectionState.retryCount++;
    this.updateConnectionState('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnection attempt ${this.connectionState.retryCount}`);
      this.connect();
    }, this.config.reconnectInterval);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
        // SSE connections are kept alive by the server
        // This is just to check the connection state
      } else if (this.usePusher && this.pusherClient) {
        // Pusher handles its own heartbeat
      } else {
        // Connection lost, attempt reconnect
        this.scheduleReconnect();
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  reconnect() {
    this.disconnect();
    this.connectionState.retryCount = 0;
    this.connect();
  }

  disconnect() {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.pusherClient) {
      this.pusherClient.disconnect();
      this.pusherClient = null;
      this.usePusher = false;
    }

    this.updateConnectionState('disconnected');
  }

  getConnectionState(): RealtimeConnectionState {
    return { ...this.connectionState };
  }

  setConnectionStateChangeHandler(handler: (state: RealtimeConnectionState) => void) {
    this.onConnectionStateChange = handler;
  }

  isConnected(): boolean {
    return this.connectionState.status === 'connected';
  }
}