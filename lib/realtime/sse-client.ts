'use client';

export class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, (data: any) => void> = new Map();

  connect(endpoint: string) {
    if (this.eventSource) {
      this.disconnect();
    }

    this.eventSource = new EventSource(endpoint);

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const listener = this.listeners.get(data.type || 'message');
        if (listener) {
          listener(data);
        }
      } catch (error) {
        console.error('SSE parse error:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // EventSource will auto-reconnect
    };
  }

  on(event: string, callback: (data: any) => void) {
    this.listeners.set(event, callback);
  }

  off(event: string) {
    this.listeners.delete(event);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.listeners.clear();
  }
}