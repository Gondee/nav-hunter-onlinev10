// Real-time event types and interfaces
export type RealtimeEventType =
  | 'log_message'
  | 'ai_log_message'
  | 'new_alert'
  | 'play_tts_audio'
  | 'update_stats'
  | 'monitoring_status'
  | 'ws_status'
  | 'ws_status_flash'
  | 'test_ticker_finished'
  | 'replay_finished'
  | 'server_shutting_down'
  | 'filing'
  | 'alert'
  | 'status'
  | 'error'
  | 'connected';

export interface RealtimeEvent {
  type: RealtimeEventType;
  data: any;
  timestamp: number;
  id?: string;
}

export interface LogMessageData {
  message: string;
  level?: 'info' | 'warning' | 'error' | 'debug';
  timestamp?: string;
}

export interface AILogMessageData {
  message: string;
  model?: string;
  tokens?: number;
  timestamp?: string;
}

export interface NewAlertData {
  id: string;
  symbol: string;
  price: number;
  volume?: number;
  change?: number;
  message?: string;
  timestamp: string;
}

export interface PlayTTSAudioData {
  text: string;
  voice?: string;
  speed?: number;
}

export interface UpdateStatsData {
  totalAlerts?: number;
  activeMonitors?: number;
  uptime?: number;
  lastUpdate?: string;
  [key: string]: any;
}

export interface MonitoringStatusData {
  isActive: boolean;
  monitors: Array<{
    symbol: string;
    status: 'active' | 'paused' | 'error';
    lastCheck?: string;
  }>;
}

export interface WSStatusData {
  connected: boolean;
  latency?: number;
  reconnectAttempts?: number;
  lastError?: string;
}

export interface WSStatusFlashData {
  message: string;
  type: 'success' | 'warning' | 'error';
  duration?: number;
}

export interface TestTickerFinishedData {
  symbol: string;
  success: boolean;
  results?: any;
  error?: string;
}

export interface ReplayFinishedData {
  success: boolean;
  totalProcessed?: number;
  errors?: string[];
  duration?: number;
}

export interface ServerShuttingDownData {
  reason?: string;
  gracePeriod?: number;
}

export type RealtimeConnectionStatus = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnecting';

export interface RealtimeConnectionState {
  status: RealtimeConnectionStatus;
  error?: Error;
  retryCount: number;
  lastConnected?: Date;
}

export interface RealtimeClientConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enablePusherFallback?: boolean;
  pusherConfig?: {
    appKey: string;
    cluster: string;
    forceTLS?: boolean;
  };
}

export interface RealtimeContextValue {
  connectionState: RealtimeConnectionState;
  events: RealtimeEvent[];
  subscribe: (eventType: RealtimeEventType, handler: (data: any) => void) => () => void;
  unsubscribe: (eventType: RealtimeEventType, handler: (data: any) => void) => void;
  clearEvents: () => void;
  reconnect: () => void;
}

// SEC Filing types
export interface Filing {
  id: string;
  companyName: string;
  ticker: string;
  formType: string;
  filedAt: string;
  reportDate?: string;
  value?: number;
  linkToFilingDetails: string;
  linkToHtml?: string;
  raw?: any;
}

export interface AIAnalysis {
  isAlertWorthy: boolean;
  confidenceScore: number;
  alertHighlight: boolean;
  textToSpeak: string;
  isChinese: boolean;
  investors?: string;
  RaiseOrAnnouncement?: string;
  'Event Type'?: string;
  Asset?: string;
  'Key Quote'?: string;
  [key: string]: any;
}

export interface Alert {
  filing: Filing;
  aiAnalysis: AIAnalysis;
}

export interface Stats {
  processed: number;
  alerts: number;
  uptime: string;
  connectionStatus: string;
  connectionColor: string;
}