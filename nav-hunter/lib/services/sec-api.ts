interface SecMonitoringResponse {
  status: string;
  isMonitoring?: boolean;
  connected?: boolean;
}

interface AIAnalysisRequest {
  filing: any;
  prompt?: string;
}

interface AIAnalysisResponse {
  analysis: string;
  filing: {
    id: string;
    ticker: string;
    companyName: string;
    value: number;
  };
  timestamp: string;
}

export class SecAPI {
  static async startMonitoring(config?: any): Promise<SecMonitoringResponse> {
    const response = await fetch('/api/sec/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', config }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to start monitoring');
    }
    
    return response.json();
  }
  
  static async stopMonitoring(): Promise<SecMonitoringResponse> {
    const response = await fetch('/api/sec/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to stop monitoring');
    }
    
    return response.json();
  }
  
  static async getMonitoringStatus(): Promise<SecMonitoringResponse> {
    const response = await fetch('/api/sec/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get monitoring status');
    }
    
    return response.json();
  }
  
  static async analyzeFiling(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze filing');
    }
    
    return response.json();
  }
  
  static async generateSpeech(text: string, voice: string = 'alloy'): Promise<Blob> {
    const response = await fetch('/api/ai/analyze', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }
    
    return response.blob();
  }
  
  static async playAlertSound(text: string): Promise<void> {
    try {
      const audioBlob = await this.generateSpeech(text);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Failed to play alert sound:', error);
    }
  }
  
  static async testTicker(ticker: string, config: any): Promise<any> {
    const response = await fetch('/api/sec/test-ticker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, config }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to test ticker');
    }
    
    return response.json();
  }
  
  static async replayLogFile(config: any): Promise<any> {
    const response = await fetch('/api/sec/replay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to replay log file');
    }
    
    return response.json();
  }
}