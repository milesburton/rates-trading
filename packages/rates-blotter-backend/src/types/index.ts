// Server configuration types
export interface ServerConfig {
  port?: number;
  host?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  corsOrigins?: string | string[] | boolean;
  marketUpdateInterval?: number;
  marketScenario?: 'normal' | 'highVolatility' | 'trending' | 'flashEvent';
  volatilityMultiplier?: number;
  maxUpdatesPerSecond?: number;
  bucketSize?: number;
}

// Socket.IO related types
export interface ClientSubscription {
  instrumentIds: string[];
  filters?: FilterExpression;
  updateFrequency?: number;
}

export interface ClientState {
  id: string;
  subscriptions: Map<string, ClientSubscription>;
  tokenBucket: {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    tokensPerSecond: number;
  };
  lastUpdate: Map<string, number>;
}

// Filter expression types using json-logic-js compatible structure
export type FilterValue = string | number | boolean | null | FilterValue[] | Record<string, FilterValue>;

export interface FilterExpression {
  [operator: string]: FilterValue;
}

// Subscription request from client
export interface SubscriptionRequest {
  instrumentIds: string[];
  filter?: FilterExpression;
  updateFrequency?: number;
}

// Delta update types
export interface DeltaUpdate {
  instrumentId: string;
  timestamp: number;
  fields: Record<string, any>;
}

export interface BatchUpdate {
  updates: DeltaUpdate[];
  timestamp: number;
}

// Performance metrics types
export interface PerformanceMetrics {
  updateFrequency: number;
  averageUpdateSize: number;
  peakUpdateSize: number;
  clientCount: number;
  lastUpdateTime: number;
  totalUpdates: number;
}

// Server status types
export interface ServerStatus {
  uptime: number;
  activeClients: number;
  instrumentCount: number;
  updatesSent: number;
  cpuUsage?: number;
  memoryUsage?: number;
  lastUpdateTime: number;
}

// API DTOs for request/response
export namespace API {
  // Request DTOs
  export interface CreateInstrumentRequest {
    id: string;
    name: string;
    securityType: string;
    currency: string;
    status?: string;
    [key: string]: any; // Allow additional properties
  }

  export interface UpdateInstrumentRequest {
    name?: string;
    securityType?: string;
    currency?: string;
    status?: string;
    [key: string]: any; // Allow additional properties
  }

  export interface UpdateStatusRequest {
    status: string;
  }

  // Response DTOs
  export interface InstrumentResponse {
    id: string;
    name: string;
    securityType: string;
    currency: string;
    status: string;
    lastUpdated: number;
    [key: string]: any;
  }

  export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    count?: number;
  }

  export interface InstrumentsResponse {
    instruments: InstrumentResponse[];
    count: number;
  }
}