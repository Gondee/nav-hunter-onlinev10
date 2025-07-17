// Global event bus for broadcasting messages across API routes
class EventBus {
  private static instance: EventBus;
  private clients: Set<ReadableStreamDefaultController> = new Set();
  
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  addClient(controller: ReadableStreamDefaultController) {
    this.clients.add(controller);
  }
  
  removeClient(controller: ReadableStreamDefaultController) {
    this.clients.delete(controller);
  }
  
  broadcast(message: any) {
    console.log('[EventBus] Broadcasting:', message.type, 'to', this.clients.size, 'clients');
    
    const encoder = new TextEncoder();
    const data = `data: ${JSON.stringify(message)}\n\n`;
    
    this.clients.forEach((client) => {
      try {
        client.enqueue(encoder.encode(data));
      } catch (error) {
        console.error('[EventBus] Failed to send to client:', error);
        this.clients.delete(client);
      }
    });
  }
  
  getClientCount(): number {
    return this.clients.size;
  }
}

export const eventBus = EventBus.getInstance();