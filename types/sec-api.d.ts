declare module 'sec-api' {
  export function setApiKey(apiKey: string): void;
  
  export const queryApi: {
    setApiKey(apiKey: string): void;
    getFilings(query: any): Promise<any>;
  };
  
  export const streamApi: {
    setApiKey(apiKey: string): void;
    connect(apiKey: string): void;
    close(): void;
  };
}