export interface ScraperSuccessResponse {
  message: string;
  description: string;
  date: string;
  requestId: string;
  status: 'pending';
}

export interface ScraperAlreadyRunningResponse {
  error: string;
  message: string;
  status: 'pending' | 'running';
  lastRequestedAt: string;
}

export interface ScraperErrorResponse {
  error: string;
  message: string;
  details?: string;
}

export type ScraperResponse = ScraperSuccessResponse | ScraperAlreadyRunningResponse | ScraperErrorResponse;

export interface ScrapeBatchResponse {
  success: boolean;
  message: string;
  targetDates?: string[];
}

export interface ScrapeDateRequest {
  date: string;
}

export interface ScrapeDateResponse {
  success: boolean;
  message: string;
  date?: string;
}