export interface RateLimitRecord {
  id: string;
  date: string;
  count: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRequestedAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RateLimitResponse {
  id: string;
  date: string;
  count: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRequestedAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RateLimitsListResponse {
  records: RateLimitRecord[];
}

export interface RateLimitErrorResponse {
  error: string;
  message?: string;
  details?: string;
}